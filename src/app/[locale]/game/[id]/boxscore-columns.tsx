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
        <div className="w-[75px] sm:w-full">
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
  },
  {
    accessorKey: "pim",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PIM" />
    ),
  },
  {
    accessorKey: "shots",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SOG" />
    ),
  },
  {
    accessorKey: "hits",
    header: ({ column }) => <DataTableColumnHeader column={column} title="H" />,
  },
  {
    accessorKey: "faceoffWinningPctg",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="F%" />
    ),
    accessorFn: (row) => row.faceoffWinningPctg.toFixed(3),
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
        <div className="w-[75px]">
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
    accessorKey: "saveShotsAgainst",
    header: ({ column }) => <DataTableColumnHeader column={column} title="S" />,
  },
  {
    accessorKey: "savePctg",
    header: ({ column }) => <DataTableColumnHeader column={column} title="%" />,
  },
  {
    accessorKey: "toi",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="TOI" />
    ),
  },
];
