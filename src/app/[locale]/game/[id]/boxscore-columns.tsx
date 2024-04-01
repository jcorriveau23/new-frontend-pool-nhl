"use client";
import { GoalieStats, SkaterStats } from "@/data/nhl/gameBoxScore";
import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/ui/column-header";

export const skaterColumns: ColumnDef<SkaterStats>[] = [
  {
    accessorKey: "player",
    header: "Player",
    cell: ({ row }) => {
      const player = row.original;
      return <div className="w-[75px] sm:w-full">{player.name.default}</div>;
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
      return <div className="w-[75px]">{player.name.default}</div>;
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
