"use client";
import { DataTable } from "@/components/ui/data-table";
import { useGamesNightContext } from "@/context/games-night-context";
import { Game } from "@/data/nhl/game";
import { Player } from "@/data/pool/model";
import React from "react";
import { GameTime, PlayerPreviewColumn } from "./preview-columns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TotalPreviewColumn } from "./preview-columns";
import { useTranslations } from "next-intl";
import { usePoolContext } from "@/context/pool-context";
import { Row } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

export class PreviewPlayer {
  constructor(player: Player, gameByTeam: Record<number, Game>) {
    const game = player.team ? (gameByTeam[player.team] ?? null) : null;

    this.name = player.name;
    this.id = player.id;
    this.team = player.team;
    this.playingAgainst = game
      ? game.homeTeam.id === player.team
        ? game.awayTeam.id
        : game.homeTeam.id
      : null;
    this.isHome = game ? game.homeTeam.id === player.team : null;
    this.startTimeUTC = game?.startTimeUTC ?? null;
  }
  name: string;
  id: number;
  team: number | null;
  playingAgainst: number | null;
  isHome: boolean | null;
  startTimeUTC: string | null;
}

export class PreviewTotal {
  constructor(
    participant: string,
    forwards: PreviewPlayer[],
    defense: PreviewPlayer[],
    goalies: PreviewPlayer[],
  ) {
    this.participant = participant;
    this.forwardsPlaying = countPlaying(forwards);
    this.defensePlaying = countPlaying(defense);
    this.goaliesPlaying = countPlaying(goalies);
  }
  participant: string;
  forwardsPlaying: number;
  defensePlaying: number;
  goaliesPlaying: number;
}

const countPlaying = (players: PreviewPlayer[]) =>
  players.filter((p) => p.playingAgainst !== null).length;

/*
The order a pooler reads the evening in: whoever is in action first, earliest
puck drop leading, and the players with no game at the bottom.
*/
const byPuckDrop = (a: PreviewPlayer, b: PreviewPlayer) => {
  if ((a.startTimeUTC === null) !== (b.startTimeUTC === null)) {
    return a.startTimeUTC === null ? 1 : -1;
  }
  const byTime = (a.startTimeUTC ?? "").localeCompare(b.startTimeUTC ?? "");
  return byTime !== 0 ? byTime : a.name.localeCompare(b.name);
};

const rosterPreview = (
  playerIds: number[] | undefined,
  players: Record<number, Player> | undefined,
  gameByTeam: Record<number, Game>,
) =>
  (playerIds ?? [])
    .map((playerId) => players?.[playerId])
    .filter((player): player is Player => player !== undefined)
    .map((player) => new PreviewPlayer(player, gameByTeam))
    .sort(byPuckDrop);

export default function DailyPreviewContent() {
  const t = useTranslations();
  const { gameByTeam } = useGamesNightContext();
  const {
    poolInfo,
    selectedParticipant,
    selectedPoolUser,
    updateSelectedParticipant,
  } = usePoolContext();

  const preview = React.useMemo(() => {
    const forwards: Record<string, PreviewPlayer[]> = {};
    const defense: Record<string, PreviewPlayer[]> = {};
    const goalies: Record<string, PreviewPlayer[]> = {};
    const totals: PreviewTotal[] = [];

    for (const user of poolInfo.participants ?? []) {
      const roster = poolInfo.context?.pooler_roster[user.id];
      const players = poolInfo.context?.players;

      forwards[user.id] = rosterPreview(
        roster?.chosen_forwards,
        players,
        gameByTeam,
      );
      defense[user.id] = rosterPreview(
        roster?.chosen_defenders,
        players,
        gameByTeam,
      );
      goalies[user.id] = rosterPreview(
        roster?.chosen_goalies,
        players,
        gameByTeam,
      );

      totals.push(
        new PreviewTotal(
          user.name,
          forwards[user.id],
          defense[user.id],
          goalies[user.id],
        ),
      );
    }

    return { forwards, defense, goalies, totals };
  }, [poolInfo.participants, poolInfo.context, gameByTeam]);

  const selectedRoster = React.useMemo(() => {
    const forwards = preview.forwards[selectedPoolUser.id] ?? [];
    const defense = preview.defense[selectedPoolUser.id] ?? [];
    const goalies = preview.goalies[selectedPoolUser.id] ?? [];
    const all = [...forwards, ...defense, ...goalies];

    return {
      forwards,
      defense,
      goalies,
      playing: countPlaying(all),
      total: all.length,
      // The first of the pooler's own games to start, which is when their
      // night actually begins.
      firstPuckDrop:
        all.find((player) => player.startTimeUTC !== null)?.startTimeUTC ??
        null,
    };
  }, [preview, selectedPoolUser.id]);

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

  const PreviewPlayersTable = (players: PreviewPlayer[]) => (
    <DataTable
      data={players}
      columns={PlayerPreviewColumn}
      initialState={{
        columnPinning: { left: ["ranking", "name"] },
      }}
      meta={{
        props: {},
        // A player with no game tonight is still on the roster, but nothing
        // they do can move the pooler's night — so they read as background.
        getRowStyles: (row: Row<PreviewPlayer>) =>
          row.original.playingAgainst === null ? "text-muted-foreground" : null,
        onRowClick: () => null,
        t: t,
      }}
      title={null}
      tableFooter={null}
    />
  );

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
          <span
            className={cn(
              "text-xs font-normal tabular-nums",
              playing === 0 ? "text-muted-foreground" : "text-primary",
            )}
          >
            {playing}/{total}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-2">{table}</AccordionContent>
    </AccordionItem>
  );

  return (
    <div className="space-y-6 py-4">
      <div>{PreviewTotalTable(preview.totals, t("PreviewPlayersPlaying"))}</div>
      <div className="space-y-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span>
            {t("PreviewPlayersInAction", {
              playing: selectedRoster.playing,
              total: selectedRoster.total,
            })}
          </span>
          {selectedRoster.firstPuckDrop !== null ? (
            <>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1">
                {t("PreviewFirstPuckDrop")}
                <GameTime startTimeUTC={selectedRoster.firstPuckDrop} />
              </span>
            </>
          ) : null}
        </div>
        <Accordion
          key={selectedPoolUser.id}
          defaultValue={["forwards", "defense", "goalies"]}
          className="space-y-2"
        >
          {PreviewSection(
            "forwards",
            t("Forwards"),
            countPlaying(selectedRoster.forwards),
            poolInfo.settings.number_forwards,
            PreviewPlayersTable(selectedRoster.forwards),
          )}
          {PreviewSection(
            "defense",
            t("Defense"),
            countPlaying(selectedRoster.defense),
            poolInfo.settings.number_defenders,
            PreviewPlayersTable(selectedRoster.defense),
          )}
          {PreviewSection(
            "goalies",
            t("Goalies"),
            countPlaying(selectedRoster.goalies),
            poolInfo.settings.number_goalies,
            PreviewPlayersTable(selectedRoster.goalies),
          )}
        </Accordion>
      </div>
    </div>
  );
}
