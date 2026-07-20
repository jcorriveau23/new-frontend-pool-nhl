"use client";
import { GoalieStats, SkaterStats } from "@/data/nhl/gameBoxScore";
import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/ui/column-header";
import PlayerLink from "@/components/player-link";

export const skaterColumns: ColumnDef<SkaterStats>[] = [
  {
    accessorKey: "player",
    header: "Player",
    cell: ({ row }) => {
      const player = row.original;
      return (
        <div className="flex w-[90px] items-center gap-1 sm:w-full">
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            #{player.sweaterNumber}
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
      const value = row.original.plusMinus;
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
    accessorKey: "sog",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SOG" />
    ),
  },
  {
    accessorKey: "hits",
    header: ({ column }) => <DataTableColumnHeader column={column} title="H" />,
  },
  {
    accessorKey: "blockedShots",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="BkS" />
    ),
  },
  {
    accessorKey: "giveaways",
    header: ({ column }) => <DataTableColumnHeader column={column} title="GV" />,
  },
  {
    accessorKey: "takeaways",
    header: ({ column }) => <DataTableColumnHeader column={column} title="TK" />,
  },
  {
    accessorKey: "faceoffWinningPctg",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="F%" />
    ),
    accessorFn: (row) => row.faceoffWinningPctg?.toFixed(3),
  },
  {
    accessorKey: "shifts",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SFT" />
    ),
  },
  {
    accessorKey: "toi",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="TOI" />
    ),
  },
];

export const goalieColumns: ColumnDef<GoalieStats>[] = [
  {
    accessorKey: "player",
    header: "Player",
    cell: ({ row }) => {
      const player = row.original;
      return (
        <div className="flex w-[90px] items-center gap-1">
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            #{player.sweaterNumber}
          </span>
          <PlayerLink
            name={player.name.default}
            id={player.playerId}
            textStyle={null}
          />
          {player.starter ? (
            <span
              className="bg-primary size-1.5 shrink-0 rounded-full"
              title="Starter"
            />
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "saveShotsAgainst",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SV/SA" />
    ),
  },
  {
    accessorKey: "savePctg",
    header: ({ column }) => <DataTableColumnHeader column={column} title="SV%" />,
    accessorFn: (row) =>
      row.savePctg != null && row.savePctg !== ""
        ? Number(row.savePctg).toFixed(3)
        : "-",
  },
  {
    accessorKey: "goalsAgainst",
    header: ({ column }) => <DataTableColumnHeader column={column} title="GA" />,
  },
  {
    accessorKey: "pim",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PIM" />
    ),
  },
  {
    accessorKey: "toi",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="TOI" />
    ),
  },
];
