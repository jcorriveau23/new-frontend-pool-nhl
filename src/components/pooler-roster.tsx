"use client";

import * as React from "react";
import { Player, PoolUser } from "@/data/pool/model";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import PlayerLink from "./player-link";
import { TeamLogo } from "./team-logo";
import PlayerSalary from "./player-salary";
import { salaryFormat } from "@/app/utils/formating";
import ProtectedPlayerIcon from "./protected-player";
import { usePoolContext } from "@/context/pool-context";
import DraftedPlayerIcon from "./drafted-player";
import PlayerSearchDialog from "./search-players";
import { toast } from "@/hooks/use-toast";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";

interface Props {
  userRoster: {
    user: PoolUser;
    forwards: Player[];
    defense: Player[];
    goalies: Player[];
  };
  protectedPlayerIds: number[] | null;
  teamSalaryCap: number | null;
  onPlayerSelection: ((user: PoolUser, player: Player) => void) | null;
  considerOnlyProtected: boolean;
}

export default function PoolerRoster(props: Props) {
  const { poolInfo, playersOwner, updatePoolInfo, dictUsers } =
    usePoolContext();
  const userSession = useSession();
  const userData = useUser();
  const t = useTranslations();

  const getFormatedSummaryContractInfo = (players: Player[]): string => {
    const protectedPlayers = players.filter((player) =>
      props.protectedPlayerIds?.includes(player.id)
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
      salaryCap: props.teamSalaryCap ? salaryFormat(props.teamSalaryCap) : "",
    });
  };

  const SalarySummaryTable = (
    userRoster: {
      user: PoolUser;
      forwards: Player[];
      defense: Player[];
      goalies: Player[];
    },
    teamSalaryCap: number
  ) => {
    const allPlayers = [
      ...userRoster.forwards,
      ...userRoster.defense,
      ...userRoster.goalies,
    ];
    const allconsideredPlayers = allPlayers.filter(
      (player) =>
        !props.considerOnlyProtected ||
        props.protectedPlayerIds?.includes(player.id)
    );

    const totalPlayers = allconsideredPlayers.length;
    const totalPlayersWithContract = allconsideredPlayers.filter(
      (player) => player.salary_cap
    ).length;

    const totalSalary = allconsideredPlayers.reduce(
      (sum, player) => sum + (player.salary_cap ?? 0),
      0
    );
    const isOverCap = totalSalary > teamSalaryCap;

    return (
      <div className="mb-4 p-4 bg-primary-foreground rounded-md">
        <h3 className="font-bold mb-2">{t("RosterStatus")}</h3>
        <p>
          {t("NumberOfPlayers", {
            playersCount: totalPlayers,
            contractCount: totalPlayersWithContract,
          })}
        </p>
        <p>
          {t("RosterSalary", {
            playersSalary: salaryFormat(totalSalary),
            teamSalaryCap: salaryFormat(teamSalaryCap),
          })}
        </p>
        <p
          className={
            isOverCap ? "text-red-500 font-bold" : "text-green-500 font-bold"
          }
        >
          {isOverCap
            ? t("OverCap", {
                diff: salaryFormat(Math.abs(teamSalaryCap - totalSalary)),
              })
            : t("UnderCap", {
                diff: salaryFormat(Math.abs(teamSalaryCap - totalSalary)),
              })}
        </p>
      </div>
    );
  };

  const SkatersTable = (user: PoolUser, players: Player[], title: string) => (
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
                <TableHead>{t("GP")}</TableHead>
                <TableHead>{t("G")}</TableHead>
                <TableHead>{t("A")}</TableHead>
                <TableHead>{t("PTS")}</TableHead>
                <TableHead>{t("PTS/G")}</TableHead>
                <TableHead>{t("AGE")}</TableHead>
                <TableHead>{t("Salary")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players
                .sort((p1, p2) => p2.salary_cap! - p1.salary_cap!)
                .map((player, i) => (
                  <TableRow
                    key={player.id}
                    onClick={() => props.onPlayerSelection?.(user, player)}
                  >
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <PlayerLink
                        name={player.name}
                        id={player.id}
                        textStyle={null}
                      />
                      {props.protectedPlayerIds?.includes(player.id) ? (
                        <ProtectedPlayerIcon
                          playerName={player.name}
                          userName={props.userRoster.user.name}
                          onIconClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                          }}
                        />
                      ) : !props.considerOnlyProtected &&
                        playersOwner[player.id] ? (
                        <DraftedPlayerIcon
                          playerName={player.name}
                          userName={props.userRoster.user.name}
                          onIconClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                          }}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <TeamLogo teamId={player.team} width={30} height={30} />
                    </TableCell>
                    <TableCell>{player.game_played}</TableCell>
                    <TableCell>{player.goals}</TableCell>
                    <TableCell>{player.assists}</TableCell>
                    <TableCell>{player.points}</TableCell>
                    <TableCell>{player.points_per_game?.toFixed(3)}</TableCell>
                    <TableCell>{player.age}</TableCell>
                    <TableCell>
                      {player.salary_cap &&
                      player.contract_expiration_season ? (
                        <PlayerSalary
                          playerName={player.name}
                          team={player.team}
                          salary={player.salary_cap}
                          contractExpirationSeason={
                            player.contract_expiration_season
                          }
                          onBadgeClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                          }}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
            {poolInfo.settings.salary_cap ?? 0 > 0 ? (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>{t("TotalProtected")}</TableCell>
                  <TableCell colSpan={7}>
                    {getFormatedSummaryContractInfo(players)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const GoaliesTable = (user: PoolUser, players: Player[], title: string) => (
    <Accordion type="single" collapsible defaultValue="all">
      <AccordionItem value="all">
        <AccordionTrigger>{`${t(title)} (${players.length})`}</AccordionTrigger>
        <AccordionContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("#")}</TableHead>
                <TableHead>{t("Player")}</TableHead>
                <TableHead>{t("T")}</TableHead>
                <TableHead>{t("GP")}</TableHead>
                <TableHead>{t("wins")}</TableHead>
                <TableHead>{t("ot")}</TableHead>
                <TableHead>{t("s%")}</TableHead>
                <TableHead>{t("GAA")}</TableHead>
                <TableHead>{t("Age")}</TableHead>
                <TableHead>{t("Salary")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players
                .sort((p1, p2) => p2.salary_cap! - p1.salary_cap!)
                .map((player, i) => (
                  <TableRow
                    key={player.id}
                    onClick={() => props.onPlayerSelection?.(user, player)}
                  >
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <PlayerLink
                        name={player.name}
                        id={player.id}
                        textStyle={null}
                      />
                      {props.protectedPlayerIds?.includes(player.id) ? (
                        <ProtectedPlayerIcon
                          playerName={player.name}
                          userName={props.userRoster.user.name}
                          onIconClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                          }}
                        />
                      ) : !props.considerOnlyProtected &&
                        playersOwner[player.id] ? (
                        <DraftedPlayerIcon
                          playerName={player.name}
                          userName={props.userRoster.user.name}
                          onIconClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                          }}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <TeamLogo teamId={player.team} width={30} height={30} />
                    </TableCell>
                    <TableCell>{player.game_played}</TableCell>
                    <TableCell>{player.wins}</TableCell>
                    <TableCell>{player.ot}</TableCell>
                    <TableCell>{player.save_percentage?.toFixed(3)}</TableCell>
                    <TableCell>
                      {player.goal_against_average?.toFixed(2)}
                    </TableCell>
                    <TableCell>{player.age}</TableCell>
                    <TableCell>
                      {player.salary_cap &&
                      player.contract_expiration_season ? (
                        <PlayerSalary
                          playerName={player.name}
                          team={player.team}
                          salary={player.salary_cap}
                          contractExpirationSeason={
                            player.contract_expiration_season
                          }
                          onBadgeClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                          }}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
            {poolInfo.settings.salary_cap ?? 0 > 0 ? (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>{t("TotalProtected")}</TableCell>
                  <TableCell colSpan={7}>
                    {getFormatedSummaryContractInfo(players)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const onPlayerSelect = async (player: Player) => {
    const res = await fetch("/api-rust/add-player", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession.info?.jwt}`,
      },
      body: JSON.stringify({
        pool_name: poolInfo.name,
        added_player_user_id: props.userRoster.user.id,
        player: player,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      toast({
        variant: "destructive",
        title: t("CouldNotAddPlayerToRoster", {
          playerName: player.name,
          userName: dictUsers[props.userRoster.user.id].name,
          error: error,
        }),
        duration: 5000,
      });
      return false;
    }

    const data = await res.json();
    updatePoolInfo(data);
    toast({
      title: t("SuccessAddPlayerToRoster", {
        playerName: player.name,
        userName: dictUsers[props.userRoster.user.id].name,
      }),
      duration: 2000,
    });

    return true;
  };

  return (
    <>
      {props.teamSalaryCap
        ? SalarySummaryTable(props.userRoster, props.teamSalaryCap)
        : null}
      {userData.info?.id === poolInfo.owner && (
        <PlayerSearchDialog
          label={t("Add player")}
          onPlayerSelect={(player) => onPlayerSelect(player)}
        />
      )}
      {SkatersTable(
        props.userRoster.user,
        props.userRoster.forwards,
        "Forwards"
      )}
      {SkatersTable(props.userRoster.user, props.userRoster.defense, "Defense")}
      {GoaliesTable(props.userRoster.user, props.userRoster.goalies, "Goalies")}
    </>
  );
}
