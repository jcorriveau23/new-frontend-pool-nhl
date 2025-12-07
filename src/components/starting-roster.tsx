"use client";

import * as React from "react";
import { Player, PoolUser, Position } from "@/data/pool/model";
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
import { usePoolContext } from "@/context/pool-context";
import { toast } from "@/hooks/use-toast";
import { useSession } from "@/context/useSessionData";
import { Button } from "./ui/button";
import { PlusCircledIcon, MinusCircledIcon } from "@radix-ui/react-icons";
import PlayerSearchDialog from "./search-players";
import { useUser } from "@/context/useUserData";

interface Props {
  userRoster: {
    user: PoolUser;
    forwards: Player[];
    defense: Player[];
    goalies: Player[];
    reservists: Player[];
  };
  teamSalaryCap: number | null;
}

export default function StartingRoster(props: Props) {
  const { poolInfo, updatePoolInfo, dictUsers } = usePoolContext();
  const userSession = useSession();
  const userData = useUser();
  const t = useTranslations();

  const [selectedForwards, setSelectedForwards] = React.useState<Player[]>(
    props.userRoster.forwards.map((player) => player)
  );
  const [selectedDefense, setSelectedDefense] = React.useState<Player[]>(
    props.userRoster.defense.map((player) => player)
  );
  const [selectedGoalies, setSelectedGoalies] = React.useState<Player[]>(
    props.userRoster.goalies.map((player) => player)
  );
  const [selectedReservists, setSelectedReservists] = React.useState<Player[]>(
    props.userRoster.reservists.map((player) => player)
  );

  const moveToReserves = (player: Player) => {
    setSelectedReservists([...selectedReservists, player]);
    switch (player.position) {
      case Position.F: {
        setSelectedForwards(selectedForwards.filter((p) => p.id !== player.id));
        break;
      }
      case Position.D: {
        setSelectedDefense(selectedDefense.filter((p) => p.id !== player.id));
        break;
      }
      case Position.G: {
        setSelectedGoalies(selectedGoalies.filter((p) => p.id !== player.id));
        break;
      }
    }
  };

  const moveToStarters = (player: Player) => {
    switch (player.position as Position) {
      case Position.F: {
        setSelectedForwards([...selectedForwards, player]);
        break;
      }
      case Position.D: {
        setSelectedDefense([...selectedDefense, player]);
        break;
      }
      case Position.G: {
        setSelectedGoalies([...selectedGoalies, player]);
        break;
      }
    }
    setSelectedReservists(selectedReservists.filter((p) => p.id !== player.id));
  };

  const getFormatedSummaryContractInfo = (players: Player[]): string => {
    return t("TotalPlayersStartingRoster", {
      playerCount: players.length,
      totalSalary: salaryFormat(
        players.reduce(
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

    const totalPlayers = allPlayers.length;
    const totalPlayersWithContract = allPlayers.filter(
      (player) => player.salary_cap !== null
    ).length;

    const totalSalary = allPlayers.reduce(
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

  const RosterTable = (
    user: PoolUser,
    players: Player[],
    playerLimit: number,
    title: string,
    isStarter: boolean
  ) => (
    <Accordion type="single" collapsible defaultValue="all">
      <AccordionItem value="all">
        <AccordionTrigger>{`${t(title)} (${
          players.length
        }/${playerLimit})`}</AccordionTrigger>
        <AccordionContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("Player")}</TableHead>
                <TableHead>{t("T")}</TableHead>
                <TableHead>Age</TableHead>
                {poolInfo.settings.salary_cap !== null ? (
                  <TableHead>{t("Salary")}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {players
                .sort((p1, p2) => p2.salary_cap! - p1.salary_cap!)
                .map((player, i) => (
                  <TableRow key={player.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <PlayerLink
                          name={player.name}
                          id={player.id}
                          textStyle={null}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <TeamLogo teamId={player.team} width={30} height={30} />
                    </TableCell>
                    <TableCell>{player.age}</TableCell>
                    {poolInfo.settings.salary_cap !== null ? (
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
                    ) : null}

                    {userData.info?.id === user.id ||
                    userData.info?.id === poolInfo.owner ? (
                      <TableCell>
                        <Button
                          onClick={() =>
                            isStarter
                              ? moveToReserves(player)
                              : moveToStarters(player)
                          }
                          variant="outline"
                          size="sm"
                        >
                          {isStarter ? (
                            <MinusCircledIcon />
                          ) : (
                            <PlusCircledIcon />
                          )}
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
            </TableBody>
            {poolInfo.settings.salary_cap ? (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>{t("Total")}</TableCell>
                  <TableCell colSpan={4}>
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

  const onModifyRoster = async () => {
    const res = await fetch("/api-rust/modify-roster", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession.info?.jwt}`,
      },
      body: JSON.stringify({
        pool_name: poolInfo.name,
        roster_modified_user_id: props.userRoster.user.id,
        forw_list: selectedForwards.map((p) => p.id),
        def_list: selectedDefense.map((p) => p.id),
        goal_list: selectedGoalies.map((p) => p.id),
        reserv_list: selectedReservists.map((p) => p.id),
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      toast({
        variant: "destructive",
        title: t("CouldNotSaveRosterModification", {
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
      title: t("SuccessSaveRosterModification", {
        userName: dictUsers[props.userRoster.user.id].name,
      }),
      duration: 2000,
    });

    return true;
  };

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
      {userData.info?.id === poolInfo.owner && (
        <PlayerSearchDialog
          label={t("Add player")}
          onPlayerSelect={(player) => onPlayerSelect(player)}
        />
      )}
      {props.teamSalaryCap
        ? SalarySummaryTable(
            {
              user: props.userRoster.user,
              forwards: selectedForwards,
              defense: selectedDefense,
              goalies: selectedGoalies,
            },
            props.teamSalaryCap
          )
        : null}
      {RosterTable(
        props.userRoster.user,
        selectedForwards,
        poolInfo.settings.number_forwards,
        "Forwards",
        true
      )}
      {RosterTable(
        props.userRoster.user,
        selectedDefense,
        poolInfo.settings.number_defenders,
        "Defense",
        true
      )}
      {RosterTable(
        props.userRoster.user,
        selectedGoalies,
        poolInfo.settings.number_goalies,
        "Goalies",
        true
      )}
      {poolInfo.settings.number_reservists > 0
        ? RosterTable(
            props.userRoster.user,
            selectedReservists,
            poolInfo.settings.number_reservists,
            "Reservists",
            false
          )
        : null}
      <Button
        disabled={
          userData.info?.id !== poolInfo.owner &&
          userData.info?.id !== props.userRoster.user.id
        }
        onClick={() => onModifyRoster()}
      >
        Save
      </Button>
    </>
  );
}
