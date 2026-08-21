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
    goalies: PreviewPlayer[],
  ) {
    this.participant = participant;
    this.forwardsPlaying = forwards.filter((p) => p.playingAgainst).length;
    this.defensePlaying = defense.filter((p) => p.playingAgainst).length;
    this.goaliesPlaying = goalies.filter((p) => p.playingAgainst).length;
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
  const {
    poolInfo,
    selectedParticipant,
    selectedPoolUser,
    updateSelectedParticipant,
  } = usePoolContext();
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
    null,
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
    for (let i = 0; i < poolInfo.participants.length; i += 1) {
      const user = poolInfo.participants[i];

      // @ts-expect-error, player should always be in the list.
      forwardsPreviewTemp[user.id] = poolInfo.context!.pooler_roster[
        user.id
      ]?.chosen_forwards.map((playerId) => {
        const player = poolInfo.context?.players[playerId];
        if (player) return new PreviewPlayer(player, playingAgainst);
      });

      // @ts-expect-error, player should always be in the list.
      defensePreviewTemp[user.id] = poolInfo.context!.pooler_roster[
        user.id
      ].chosen_defenders.map((playerId) => {
        const player = poolInfo.context?.players[playerId];
        if (player) return new PreviewPlayer(player, playingAgainst);
      });

      // @ts-expect-error, player should always be in the list.
      goaliesPreviewTemp[user.id] = poolInfo.context!.pooler_roster[
        user.id
      ].chosen_goalies.map((playerId) => {
        const player = poolInfo.context?.players[playerId];
        if (player) return new PreviewPlayer(player, playingAgainst);
      });

      totalPreviewTemp.push(
        new PreviewTotal(
          user.name,
          forwardsPreviewTemp[user.id],
          defensePreviewTemp[user.id],
          goaliesPreviewTemp[user.id],
        ),
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
            return "bg-selection hover:bg-selection group-hover:bg-selection font-semibold border-l-4 border-l-primary";
          }
        },
        onRowClick: (row: Row<PreviewTotal>) => {
          updateSelectedParticipant(row.original.participant);
        },
        t: t,
      }}
      rowClickable
      title={title}
      tableFooter={null}
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
      tableFooter={null}
    />
  );

  const getFormatedRankingTableTitle = (title: string) =>
    `${t(title)} (${format(selectedDate ?? currentDate, "yyyy-MM-dd")})`;

  const getFormatedDateTitle = (participant: string, title: string) =>
    `${t(title)} ${participant} (${format(
      selectedDate ?? currentDate,
      "yyyy-MM-dd",
    )})`;

  React.useEffect(() => {
    getPreviewInfo();
  }, [playingAgainst]);

  const PreviewSection = (
    value: string,
    label: string,
    playing: number,
    total: number,
    table: React.ReactElement,
  ) => (
    <AccordionItem value={value} className="border-b-0">
      <AccordionTrigger className="py-2 font-semibold hover:no-underline">
        <span className="flex items-center gap-2">
          {label}
          <span className="text-xs font-normal tabular-nums text-muted-foreground">
            {playing}/{total}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-2">{table}</AccordionContent>
    </AccordionItem>
  );

  const countPlaying = (players: PreviewPlayer[]) =>
    players.filter((p) => p.playingAgainst !== null).length;

  return (
    <div className="space-y-6 py-4">
      <div>
        {totalPreview
          ? PreviewTotalTable(
              totalPreview,
              getFormatedRankingTableTitle("PreviewPlayersPlaying"),
            )
          : null}
      </div>
      <div>
        {forwardsPreview && defensePreview && goaliesPreview ? (
          <Accordion
            key={selectedPoolUser.id}
            defaultValue={["forwards", "defense", "goalies"]}
            className="space-y-2"
          >
            {PreviewSection(
              "forwards",
              t("Forwards"),
              countPlaying(forwardsPreview[selectedPoolUser.id]),
              poolInfo.settings.number_forwards,
              PreviewPlayersTable(
                forwardsPreview[selectedPoolUser.id],
                getFormatedDateTitle(
                  selectedPoolUser.name,
                  "ListOfForwardsPlayingFor",
                ),
              ),
            )}
            {PreviewSection(
              "defense",
              t("Defense"),
              countPlaying(defensePreview[selectedPoolUser.id]),
              poolInfo.settings.number_defenders,
              PreviewPlayersTable(
                defensePreview[selectedPoolUser.id],
                getFormatedDateTitle(
                  selectedPoolUser.name,
                  "ListOfDefensemanPlayingFor",
                ),
              ),
            )}
            {PreviewSection(
              "goalies",
              t("Goalies"),
              countPlaying(goaliesPreview[selectedPoolUser.id]),
              poolInfo.settings.number_goalies,
              PreviewPlayersTable(
                goaliesPreview[selectedPoolUser.id],
                getFormatedDateTitle(
                  selectedPoolUser.name,
                  "ListOfGoaliesPlayingFor",
                ),
              ),
            )}
          </Accordion>
        ) : null}
      </div>
    </div>
  );
}
