import { salaryFormat, seasonFormat } from "@/app/utils/formating";
import PlayerLink from "@/components/player-link";
import { TeamLogo } from "@/components/team-logo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePoolContext } from "@/context/pool-context";
import { getPoolerPlayers, Player, PoolUser } from "@/data/pool/model";
import { toast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import * as React from "react";
import { ShieldPlus, BadgeMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/context/useSessionData";

export default function RosterTab() {
  const {
    poolInfo,
    selectedParticipant,
    updateSelectedParticipant,
    updatePoolInfo,
  } = usePoolContext();
  const { userID, jwt } = useSession();

  const [protectedPlayerIds, setProtectedPlayerIds] = React.useState<
    number[] | null
  >(null);

  const t = useTranslations();

  const onPlayerSelection = (user: PoolUser, player: Player) => {
    // Need to have an account to protect the players.
    if (userID !== user.id && userID !== poolInfo.owner) {
      toast({
        variant: "destructive",
        title: t("CannotUpdateProtectedPlayers", { userName: user.name }),
        duration: 2000,
      });
      return;
    }

    // Update the list of protected players.
    setProtectedPlayerIds((prevPlayers) => {
      if (prevPlayers === null) {
        return [player.id];
      }
      // Check if the player is already in the list
      if (prevPlayers.includes(player.id)) {
        // Remove the player from the list
        return prevPlayers.filter((id) => id !== player.id);
      } else {
        // Cannot protect to much players.
        if (
          prevPlayers &&
          prevPlayers.length >=
            (poolInfo.settings.dynasty_settings
              ?.next_season_number_players_protected ?? 0)
        ) {
          toast({
            variant: "destructive",
            title: t("TooMuchProtectedPlayers", {
              limit:
                poolInfo.settings.dynasty_settings
                  ?.next_season_number_players_protected,
            }),
            duration: 2000,
          });
          return prevPlayers;
        }
        // Add the player to the list
        return [...prevPlayers, player.id];
      }
    });
  };

  const onSave = async (user: PoolUser) => {
    // Need to have an account to protect the players.
    if (userID !== user.id && userID !== poolInfo.owner) {
      toast({
        variant: "destructive",
        title: t("CannotUpdateProtectedPlayers", { userName: user.name }),
        duration: 2000,
      });
      return;
    }

    const res = await fetch("/api-rust/protect-players", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        pool_name: poolInfo.name,
        protected_players: new Set(protectedPlayerIds ?? []),
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      toast({
        variant: "destructive",
        title: t("CouldNotProtectPlayers", {
          name: poolInfo.name,
          error: error,
        }),
        duration: 2000,
      });
      return;
    }

    const data = await res.json();
    updatePoolInfo(data);
  };

  const RosterTable = (user: PoolUser, players: Player[], title: string) => (
    <Accordion type="single" collapsible defaultValue="all">
      <AccordionItem value="all">
        <AccordionTrigger>{`${t(title)} (${players.length})`}</AccordionTrigger>
        <AccordionContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("Player")}</TableHead>
                <TableHead>{t("T")}</TableHead>
                <TableHead>{t("Age")}</TableHead>
                <TableHead>{t("Salary")}</TableHead>
                <TableHead>{t("Expiration")}</TableHead>
                <TableHead>{t("Protected")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players
                .sort((p1, p2) => p2.salary_cap! - p1.salary_cap!)
                .map((player, i) => (
                  <TableRow
                    key={player.id}
                    onClick={() => onPlayerSelection(user, player)}
                  >
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <PlayerLink
                        name={player.name}
                        id={player.id}
                        textStyle={null}
                      />
                    </TableCell>
                    <TableCell>
                      <TeamLogo teamId={player.team} width={30} height={30} />
                    </TableCell>
                    <TableCell>{player.age}</TableCell>
                    <TableCell>
                      {player.salary_cap
                        ? salaryFormat(player.salary_cap)
                        : null}
                    </TableCell>
                    <TableCell>
                      {player.contract_expiration_season
                        ? seasonFormat(player.contract_expiration_season, 0)
                        : null}
                    </TableCell>
                    <TableCell>
                      {protectedPlayerIds?.includes(player.id) ? (
                        <ShieldPlus color="green" />
                      ) : (
                        <BadgeMinus color="red" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>{t("TotalProtected")}</TableCell>
                <TableCell colSpan={4}>
                  {getFormatedSummaryContractInfo(players)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const getFormatedSummaryContractInfo = (players: Player[]): string => {
    const protectedPlayers = players.filter((player) =>
      protectedPlayerIds?.includes(player.id)
    );
    return t("TotalPlayersProtected", {
      playerCount: protectedPlayers.length,
      contractCount: protectedPlayers.filter((player) => player.salary_cap)
        .length,
      totalSalary: salaryFormat(
        protectedPlayers.reduce(
          (accumulator, currentValue) =>
            accumulator + (currentValue.salary_cap ?? 0),
          0
        )
      ),
      salaryCap: poolInfo.settings.salary_cap
        ? salaryFormat(poolInfo.settings.salary_cap)
        : null,
    });
  };

  const SummaryTable = (userRoster: {
    userId: string;
    forwards: Player[];
    defense: Player[];
    goalies: Player[];
  }) => {
    return (
      <Table>
        <TableBody>
          <TableRow>
            <TableHead>{t("Total")}</TableHead>
            <TableCell>
              {getFormatedSummaryContractInfo([
                ...userRoster.forwards,
                ...userRoster.defense,
                ...userRoster.goalies,
              ])}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  };

  const ParticipantRoster = (user: PoolUser) => {
    const userRoster = getPoolerPlayers(poolInfo.context!, user.id);

    return (
      <>
        {SummaryTable(userRoster)}
        {RosterTable(user, userRoster.forwards, "Forwards")}
        {RosterTable(user, userRoster.defense, "Defense")}
        {RosterTable(user, userRoster.goalies, "Goalies")}
        <div className="flex justify-end">
          <Button
            disabled={
              !jwt ||
              protectedPlayerIds?.length !==
                poolInfo.settings.dynasty_settings
                  ?.next_season_number_players_protected
            }
            onClick={() => onSave(user)}
          >
            {t("Save")}
          </Button>
        </div>
      </>
    );
  };

  return (
    <>
      <Tabs
        defaultValue={selectedParticipant}
        value={selectedParticipant}
        onValueChange={(userName) => updateSelectedParticipant(userName)}
      >
        <div className="overflow-auto">
          <TabsList>
            {poolInfo.participants?.map((user) => (
              <TabsTrigger key={user.id} value={user.name}>
                {user.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {poolInfo.participants?.map((user) => (
          <TabsContent key={user.id} value={user.name}>
            {ParticipantRoster(user)}
          </TabsContent>
        ))}
        {userID === poolInfo.owner ? <Button>Save</Button> : null}
      </Tabs>
    </>
  );
}
