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
import { Props } from "./daily-tab";
import { useTranslations } from "next-intl";
import { useDateContext } from "@/context/date-context";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePoolContext } from "@/context/pool-context";
import { Row } from "@tanstack/react-table";

export class PreviewPlayer {
  constructor(player: Player, playingAgainst: Record<number, number>) {
    this.name = player.name;
    this.team = player.team;
    this.playingAgainst = playingAgainst[player.team] ?? null;
  }
  name: string;
  team: number;
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

export default function DailyPreviewContent(props: Props) {
  const t = useTranslations();
  const { playingAgainst } = useGamesNightContext();
  const { selectedDate } = useDateContext();
  const { selectedParticipant, updateSelectedParticipant, dictUsers } =
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
    if (props.poolInfo.participants === null) {
      return;
    }

    const forwardsPreviewTemp: Record<string, PreviewPlayer[]> = {};
    const defensePreviewTemp: Record<string, PreviewPlayer[]> = {};
    const goaliesPreviewTemp: Record<string, PreviewPlayer[]> = {};
    const totalPreviewTemp = [];
    // First create a table for all players for each poolers
    for (var i = 0; i < props.poolInfo.participants.length; i += 1) {
      const participant = props.poolInfo.participants[i];

      // @ts-ignore
      forwardsPreviewTemp[participant] = props.poolInfo.context?.pooler_roster[
        participant
      ]?.chosen_forwards.map((playerId) => {
        const player = props.poolInfo.context?.players[playerId];
        if (player) {
          return new PreviewPlayer(player, playingAgainst);
        }
      });
      // @ts-ignore
      defensePreviewTemp[participant] = props.poolInfo.context?.pooler_roster[
        participant
      ].chosen_defenders.map((playerId) => {
        const player = props.poolInfo.context?.players[playerId];
        if (player) {
          return new PreviewPlayer(player, playingAgainst);
        }
      });
      // @ts-ignore
      goaliesPreviewTemp[participant] = props.poolInfo.context?.pooler_roster[
        participant
      ].chosen_goalies.map((playerId) => {
        const player = props.poolInfo.context?.players[playerId];
        if (player) {
          return new PreviewPlayer(player, playingAgainst);
        }
      });

      totalPreviewTemp.push(
        new PreviewTotal(
          participant,
          forwardsPreviewTemp[participant],
          defensePreviewTemp[participant],
          goaliesPreviewTemp[participant]
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
        props: { dictUsers },
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
        props: { dictUsers },
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={title}
    />
  );

  const getFormatedRankingTableTitle = (title: string) =>
    `${t(title)} (${format(selectedDate, "yyyy-MM-dd")})`;

  const getFormatedDateTitle = (participant: string, title: string) =>
    `${t(title)} ${dictUsers[participant]} (${format(
      selectedDate,
      "yyyy-MM-dd"
    )})`;

  React.useEffect(() => {
    getPreviewInfo();
  }, [playingAgainst]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2">
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
          onValueChange={(participant) =>
            updateSelectedParticipant(participant)
          }
        >
          <TabsList>
            {props.poolInfo.participants?.map((participant) => (
              <TabsTrigger key={participant} value={participant}>
                {dictUsers[participant]}
              </TabsTrigger>
            ))}
          </TabsList>
          {props.poolInfo.participants?.map((participant) => (
            <TabsContent key={participant} value={participant}>
              {forwardsPreview && defensePreview && goaliesPreview ? (
                <>
                  <Accordion
                    key={`${participant}-forwards`}
                    type="single"
                    collapsible
                    defaultValue="forwards"
                  >
                    <AccordionItem value="forwards">
                      <AccordionTrigger>{`${t("Forwards")} (${
                        forwardsPreview[participant].filter(
                          (p) => p.playingAgainst !== null
                        ).length
                      }/${
                        props.poolInfo.settings.number_forwards
                      })`}</AccordionTrigger>
                      <AccordionContent>
                        {PreviewPlayersTable(
                          forwardsPreview[participant],
                          getFormatedDateTitle(
                            participant,
                            "List of forwards playing for"
                          )
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <Accordion
                    key={`${participant}-defense`}
                    type="single"
                    collapsible
                    defaultValue="defense"
                  >
                    <AccordionItem value="defense">
                      <AccordionTrigger>{`${t("Defense")} (${
                        defensePreview[participant].filter(
                          (p) => p.playingAgainst !== null
                        ).length
                      }/${
                        props.poolInfo.settings.number_defenders
                      })`}</AccordionTrigger>
                      <AccordionContent>
                        {PreviewPlayersTable(
                          defensePreview[participant],
                          getFormatedDateTitle(
                            participant,
                            "List of defenseman playing for"
                          )
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <Accordion
                    key={`${participant}-goalies`}
                    type="single"
                    collapsible
                    defaultValue="goalies"
                  >
                    <AccordionItem value="goalies">
                      <AccordionTrigger>{`${t("Goalies")} (${
                        goaliesPreview[participant].filter(
                          (p) => p.playingAgainst !== null
                        ).length
                      }/${
                        props.poolInfo.settings.number_goalies
                      })`}</AccordionTrigger>
                      <AccordionContent>
                        {PreviewPlayersTable(
                          goaliesPreview[participant],
                          getFormatedDateTitle(
                            participant,
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
