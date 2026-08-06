"use client";
import {
  GoalieSeasonStat,
  SkaterSeasonStat,
} from "@/data/nhl/gameLanding";
import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/ui/column-header";
import PlayerLink from "@/components/player-link";

export const skaterSeasonColumns: ColumnDef<SkaterSeasonStat>[] = [
  {
    accessorKey: "player",
    header: "Player",
    cell: ({ row }) => {
      const player = row.original;
      return (
        <div className="flex w-[110px] items-center gap-1 sm:w-full">
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {player.position}
          </span>
          <PlayerLink
            name={player.name.default}
            id={player.playerId}
            textStyle={null}
          />
        </div>
      );
    },
  },
  {
    accessorKey: "gamesPlayed",
    header: ({ column }) => <DataTableColumnHeader column={column} title="GP" />,
  },
  {
    accessorKey: "goals",
    header: ({ column }) => <DataTableColumnHeader column={column} title="G" />,
  },
  {
    accessorKey: "assists",
    header: ({ column }) => <DataTableColumnHeader column={column} title="A" />,
  },
  {
    accessorKey: "points",
    header: ({ column }) => <DataTableColumnHeader column={column} title="P" />,
  },
  {
    accessorKey: "plusMinus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="+/-" />
    ),
    cell: ({ row }) => {
      const value = row.original.plusMinus ?? 0;
      return <span>{value > 0 ? `+${value}` : value}</span>;
    },
  },
  {
    accessorKey: "pim",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PIM" />
    ),
  },
  {
    accessorKey: "powerPlayGoals",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PPG" />
    ),
  },
  {
    accessorKey: "shots",
    header: ({ column }) => <DataTableColumnHeader column={column} title="S" />,
  },
  {
    accessorKey: "shootingPctg",
    header: ({ column }) => <DataTableColumnHeader column={column} title="S%" />,
    accessorFn: (row) =>
      row.shootingPctg != null ? (row.shootingPctg * 100).toFixed(1) : "-",
  },
  {
    accessorKey: "blockedShots",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="BkS" />
    ),
  },
  {
    accessorKey: "hits",
    header: ({ column }) => <DataTableColumnHeader column={column} title="H" />,
  },
  {
    accessorKey: "avgTimeOnIce",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="TOI/G" />
    ),
  },
];

export const goalieSeasonColumns: ColumnDef<GoalieSeasonStat>[] = [
  {
    accessorKey: "player",
    header: "Player",
    cell: ({ row }) => {
      const player = row.original;
      return (
        <div className="w-[110px]">
          <PlayerLink
            name={player.name.default}
            id={player.playerId}
            textStyle={null}
          />
        </div>
      );
    },
  },
  {
    accessorKey: "gamesPlayed",
    header: ({ column }) => <DataTableColumnHeader column={column} title="GP" />,
  },
  {
    accessorKey: "wins",
    header: ({ column }) => <DataTableColumnHeader column={column} title="W" />,
  },
  {
    accessorKey: "losses",
    header: ({ column }) => <DataTableColumnHeader column={column} title="L" />,
  },
  {
    accessorKey: "otLosses",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="OTL" />
    ),
  },
  {
    accessorKey: "goalsAgainstAvg",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="GAA" />
    ),
    accessorFn: (row) =>
      row.goalsAgainstAvg != null ? row.goalsAgainstAvg.toFixed(2) : "-",
  },
  {
    accessorKey: "savePctg",
    header: ({ column }) => <DataTableColumnHeader column={column} title="SV%" />,
    accessorFn: (row) =>
      row.savePctg != null ? row.savePctg.toFixed(3) : "-",
  },
  {
    accessorKey: "shutouts",
    header: ({ column }) => <DataTableColumnHeader column={column} title="SO" />,
  },
  {
    accessorKey: "saves",
    header: ({ column }) => <DataTableColumnHeader column={column} title="SV" />,
  },
];
