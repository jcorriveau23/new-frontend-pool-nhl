"use client";
import { ColumnDef } from "@tanstack/react-table";
import { PreviewPlayer, PreviewTotal } from "./preview-content";
import { TeamLogo } from "@/components/team-logo";
import PlayerLink from "@/components/player-link";
import { PoolerName } from "@/components/pooler-name";
import { GameStatePopover } from "@/components/game-state-popover";
import { GamesNightStatus } from "@/context/games-night-context";
import { useLocale } from "next-intl";

/*
The puck drop in the reader's own time zone. The preview only ever mounts on
the client (the night's games come from a query), so reading the browser's
zone here cannot disagree with server markup.
*/
export function GameTime({ startTimeUTC }: { startTimeUTC: string | null }) {
  const locale = useLocale();

  if (startTimeUTC === null) {
    return null;
  }

  return (
    <span className="tabular-nums whitespace-nowrap">
      {new Date(startTimeUTC).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

export const TotalPreviewColumn: ColumnDef<PreviewTotal>[] = [
  {
    accessorKey: "ranking",
    header: () => <GameStatePopover state={GamesNightStatus.NOT_STARTED} />,
    cell: ({ row, table }) => {
      return (
        (table
          ?.getSortedRowModel()
          ?.flatRows?.findIndex((flatRow) => flatRow.id == row.id) || 0) + 1
      );
    },
  },
  {
    accessorKey: "pooler",
    header: "Pooler",
    cell: ({ row }) => <PoolerName name={row.original.participant} />,
  },
  {
    accessorKey: "forwardsPlaying",
    header: ({ table }) => table.options.meta?.t("ForwardsNb"),
  },
  {
    accessorKey: "defensePlaying",
    header: ({ table }) => table.options.meta?.t("DefenseNb"),
  },
  {
    accessorKey: "goaliesPlaying",
    header: ({ table }) => table.options.meta?.t("GoaliesNb"),
  },
  {
    accessorKey: "totalPlaying",
    header: "Total",
    accessorFn: (row) =>
      row.forwardsPlaying + row.defensePlaying + row.goaliesPlaying,
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">
        {row.original.forwardsPlaying +
          row.original.defensePlaying +
          row.original.goaliesPlaying}
      </span>
    ),
  },
];

export const PlayerPreviewColumn: ColumnDef<PreviewPlayer>[] = [
  {
    accessorKey: "ranking",
    header: "#",
    cell: ({ row, table }) => {
      return (
        (table
          ?.getSortedRowModel()
          ?.flatRows?.findIndex((flatRow) => flatRow.id == row.id) || 0) + 1
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ table }) => table.options.meta?.t("Player"),
    cell: ({ row }) => {
      return (
        <div className="w-[105px] sm:w-auto">
          <PlayerLink
            name={row.original.name}
            id={row.original.id}
            textStyle={null}
          />
        </div>
      );
    },
  },
  {
    accessorKey: "team",
    header: ({ table }) => table.options.meta?.t("T"),
    cell: ({ row }) => {
      return <TeamLogo teamId={row.original.team} width={22} height={22} />;
    },
  },
  {
    accessorKey: "playingAgainst",
    header: ({ table }) => table.options.meta?.t("Opponent"),
    cell: ({ row, table }) =>
      row.original.playingAgainst === null ? (
        <span className="text-muted-foreground text-xs">
          {table.options.meta?.t("PreviewNotPlaying")}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-muted-foreground w-4 shrink-0 text-xs">
            {row.original.isHome ? "vs" : "@"}
          </span>
          <TeamLogo
            teamId={row.original.playingAgainst}
            width={22}
            height={22}
          />
        </span>
      ),
  },
  {
    accessorKey: "startTimeUTC",
    header: ({ table }) => table.options.meta?.t("Time"),
    cell: ({ row }) => <GameTime startTimeUTC={row.original.startTimeUTC} />,
  },
];
