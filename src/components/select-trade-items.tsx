"use client";

import * as React from "react";
import { Player, PoolUser, Position, TradeItems } from "@/data/pool/model";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
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
import { Button } from "./ui/button";
import { PlusCircledIcon, MinusCircledIcon } from "@radix-ui/react-icons";
import { useUser } from "@/context/useUserData";
import PickList from "./pick-list";

interface Props {
  defaultTradeItems: TradeItems;
  userRoster: {
    user: PoolUser;
    forwards: Player[];
    defense: Player[];
    goalies: Player[];
    reservists: Player[];
  };
  onTradeItemsSelected: (tradeItems: TradeItems, user: PoolUser) => void;
}

export default function SelectTradeItems(props: Props) {
  const { poolInfo, dictUsers } = usePoolContext();
  const userData = useUser();
  const t = useTranslations();

  const [selectedPlayers, setSelectedPlayers] = React.useState(
    props.defaultTradeItems.players
  );
  const [selectedPicks, setSelectedPicks] = React.useState(
    props.defaultTradeItems.picks
  );

  const [tradeItems, setTradeItems] = React.useState<TradeItems>({
    players: [],
    picks: [],
  });

  const onPlayerSelected = (playerId: number) => {
    setSelectedPlayers(
      (prev) =>
        prev.includes(playerId)
          ? prev.filter((id) => id !== playerId) // Remove if exists
          : [...prev, playerId] // Add if not exists
    );
  };

  // const onPickSelected = (pick: DraftPick) => {
  //   setSelectedPicks(
  //     prev =>
  //   )
  // };

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
    players: Player[],
    playerLimit: number,
    title: string
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
                    <TableCell>
                      <Button onClick={() => {}} variant="outline" size="sm">
                        {selectedPlayers.includes(player.id) ? (
                          <MinusCircledIcon />
                        ) : (
                          <PlusCircledIcon />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  return (
    <>
      {poolInfo.settings.number_defenders > 0
        ? RosterTable(
            props.userRoster.forwards,
            poolInfo.settings.number_forwards,
            "Forwards"
          )
        : null}
      {poolInfo.settings.number_defenders > 0
        ? RosterTable(
            props.userRoster.defense,
            poolInfo.settings.number_defenders,
            "Defense"
          )
        : null}

      {poolInfo.settings.number_goalies > 0
        ? RosterTable(
            props.userRoster.goalies,
            poolInfo.settings.number_goalies,
            "Goalies"
          )
        : null}
      {poolInfo.settings.number_reservists > 0
        ? RosterTable(
            props.userRoster.reservists,
            poolInfo.settings.number_reservists,
            "Reservists"
          )
        : null}
      <PickList
        poolUser={props.userRoster.user}
        tradablePicks={poolInfo.context?.tradable_picks ?? null}
      />
      <Button
        onClick={() =>
          props.onTradeItemsSelected(tradeItems, props.userRoster.user)
        }
      >
        Save Trade Items
      </Button>
    </>
  );
}
