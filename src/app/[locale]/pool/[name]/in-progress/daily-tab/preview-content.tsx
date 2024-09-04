import { DataTable } from "@/components/ui/data-table";
import { useGamesNightContext } from "@/context/games-night-context";
import { Player } from "@/data/pool/model";
import React from "react";
import { PlayerPreviewColumn } from "./preview-columns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TotalPreviewColumn } from "./preview-columns";
import { useTranslations } from "next-intl";
import { useDateContext } from "@/context/date-context";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePoolContext } from "@/context/pool-context";
import { Row } from "@tanstack/react-table";

export class PreviewPlayer {
  constructor(player: Player, playingAgainst: Record<number, number>) {
    this.name = player.name;
    this.id = player.id;
    this.team = player.team;
    this.playingAgainst = player.team ? playingAgainst[player.team] : null;
  }
  name: string;
  id: number;
  team: number | null;
  playingAgainst: number | null;
}

export class PreviewTotal {
  constructor(
    participant: string,
    forwards: PreviewPlayer[],
    defense: PreviewPlayer[],
    goalies: PreviewPlayer[]
  ) {
    this.participant = participant;
    this.forwardsPlaying = forwards.filter(
      (p) => p.playingAgainst !== null
    ).length;
    this.defensePlaying = defense.filter(
      (p) => p.playingAgainst !== null
    ).length;
    this.goaliesPlaying = goalies.filter(
      (p) => p.playingAgainst !== null
    ).length;
  }
  participant: string;
  forwardsPlaying: number;
  defensePlaying: number;
  goaliesPlaying: number;
}

export default function DailyPreviewContent() {
  const t = useTranslations();
  const { playingAgainst } = useGamesNightContext();
  const { currentDate, selectedDate } = useDateContext();
  const { poolInfo, selectedParticipant, updateSelectedParticipant } =
    usePoolContext();
  const [forwardsPreview, setForwardsPreview] = React.useState<Record<
    string,
    PreviewPlayer[]
  > | null>(null);
  const [defensePreview, setDefensePreview] = React.useState<Record<
    string,
    PreviewPlayer[]
  > | null>(null);
  const [goaliesPreview, setGoaliesPreview] = React.useState<Record<
    string,
    PreviewPlayer[]
  > | null>(null);
  const [totalPreview, setTotalPreview] = React.useState<PreviewTotal[] | null>(
    null
  );

  const getPreviewInfo = () => {
    if (poolInfo.participants === null) {
      return;
    }

    const forwardsPreviewTemp: Record<string, PreviewPlayer[]> = {};
    const defensePreviewTemp: Record<string, PreviewPlayer[]> = {};
    const goaliesPreviewTemp: Record<string, PreviewPlayer[]> = {};
    const totalPreviewTemp = [];
    // First create a table for all players for each poolers
    for (var i = 0; i < poolInfo.participants.length; i += 1) {
      const user = poolInfo.participants[i];

      // @ts-ignore
      forwardsPreviewTemp[user.id] = poolInfo.context?.pooler_roster[
        user.id
      ]?.chosen_forwards.map((playerId) => {
        const player = poolInfo.context?.players[playerId];
        if (player) {
          return new PreviewPlayer(player, playingAgainst);
        }
      });
      // @ts-ignore
      defensePreviewTemp[user.id] = poolInfo.context?.pooler_roster[
        user.id
      ].chosen_defenders.map((playerId) => {
        const player = poolInfo.context?.players[playerId];
        if (player) {
          return new PreviewPlayer(player, playingAgainst);
        }
      });
      // @ts-ignore
      goaliesPreviewTemp[user.id] = poolInfo.context?.pooler_roster[
        user.id
      ].chosen_goalies.map((playerId) => {
        const player = poolInfo.context?.players[playerId];
        if (player) {
          return new PreviewPlayer(player, playingAgainst);
        }
      });

      totalPreviewTemp.push(
        new PreviewTotal(
          user.name,
          forwardsPreviewTemp[user.id],
          defensePreviewTemp[user.id],
          goaliesPreviewTemp[user.id]
        )
      );

      setForwardsPreview(forwardsPreviewTemp);
      setDefensePreview(defensePreviewTemp);
      setGoaliesPreview(goaliesPreviewTemp);
      setTotalPreview(totalPreviewTemp);
    }
  };

  const PreviewTotalTable = (row: PreviewTotal[], title: string) => (
    <DataTable
      data={row}
      columns={TotalPreviewColumn}
      initialState={{
        sorting: [
          {
            id: "totalPlaying",
            desc: true,
          },
        ],
        columnPinning: { left: ["ranking", "pooler"] },
      }}
      meta={{
        props: {},
        getRowStyles: (row: Row<PreviewTotal>) => {
          if (row.original.participant === selectedParticipant) {
            return "bg-selection hover:bg-selection";
          }
        },
        onRowClick: (row: Row<PreviewTotal>) => {
          updateSelectedParticipant(row.original.participant);
        },
        t: t,
      }}
      title={title}
    />
  );

  const PreviewPlayersTable = (players: PreviewPlayer[], title: string) => (
    <DataTable
      data={players}
      columns={PlayerPreviewColumn}
      initialState={{
        sorting: [
          {
            id: "playingAgainst",
            desc: true,
          },
        ],
        columnPinning: { left: ["ranking", "name"] },
      }}
      meta={{
        props: {},
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={title}
    />
  );

  const getFormatedRankingTableTitle = (title: string) =>
    `${t(title)} (${format(selectedDate ?? currentDate, "yyyy-MM-dd")})`;

  const getFormatedDateTitle = (participant: string, title: string) =>
    `${t(title)} ${participant} (${format(
      selectedDate ?? currentDate,
      "yyyy-MM-dd"
    )})`;

  React.useEffect(() => {
    getPreviewInfo();
  }, [playingAgainst]);

  return (
    <div>
      <div className="py-5 px-0 sm:px-5">
        {totalPreview
          ? PreviewTotalTable(
              totalPreview,
              getFormatedRankingTableTitle("Preview number of players playing")
            )
          : null}
      </div>
      <div className="py-5 px-0 sm:px-5">
        <Tabs
          defaultValue={selectedParticipant}
          value={selectedParticipant}
          onValueChange={(userName) => updateSelectedParticipant(userName)}
        >
          <TabsList>
            {poolInfo.participants?.map((user) => (
              <TabsTrigger key={user.id} value={user.name}>
                {user.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {poolInfo.participants?.map((user) => (
            <TabsContent key={user.id} value={user.name}>
              {forwardsPreview && defensePreview && goaliesPreview ? (
                <>
                  <Accordion
                    key={`${user.id}-forwards`}
                    type="single"
                    collapsible
                    defaultValue="forwards"
                  >
                    <AccordionItem value="forwards">
                      <AccordionTrigger>{`${t("Forwards")} (${
                        forwardsPreview[user.id].filter(
                          (p) => p.playingAgainst !== null
                        ).length
                      }/${
                        poolInfo.settings.number_forwards
                      })`}</AccordionTrigger>
                      <AccordionContent>
                        {PreviewPlayersTable(
                          forwardsPreview[user.id],
                          getFormatedDateTitle(
                            user.name,
                            "List of forwards playing for"
                          )
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <Accordion
                    key={`${user.id}-defense`}
                    type="single"
                    collapsible
                    defaultValue="defense"
                  >
                    <AccordionItem value="defense">
                      <AccordionTrigger>{`${t("Defense")} (${
                        defensePreview[user.id].filter(
                          (p) => p.playingAgainst !== null
                        ).length
                      }/${
                        poolInfo.settings.number_defenders
                      })`}</AccordionTrigger>
                      <AccordionContent>
                        {PreviewPlayersTable(
                          defensePreview[user.id],
                          getFormatedDateTitle(
                            user.name,
                            "List of defenseman playing for"
                          )
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <Accordion
                    key={`${user.id}-goalies`}
                    type="single"
                    collapsible
                    defaultValue="goalies"
                  >
                    <AccordionItem value="goalies">
                      <AccordionTrigger>{`${t("Goalies")} (${
                        goaliesPreview[user.id].filter(
                          (p) => p.playingAgainst !== null
                        ).length
                      }/${
                        poolInfo.settings.number_goalies
                      })`}</AccordionTrigger>
                      <AccordionContent>
                        {PreviewPlayersTable(
                          goaliesPreview[user.id],
                          getFormatedDateTitle(
                            user.name,
                            "List of goalies playing for"
                          )
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
