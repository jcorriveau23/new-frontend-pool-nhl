"use client";
import { GoalieStats, SkaterStats } from "@/data/nhl/gameBoxScore";
import { ColumnDef } from "@tanstack/react-table";

export const skaterColumns: ColumnDef<SkaterStats>[] = [
  {
    accessorKey: "player",
    header: "Player",
    enablePinning: true,
    cell: ({ row }) => {
      const player = row.original;
      return player.name.default;
    },
  },
  {
    accessorKey: "goals",
    header: "G",
  },
  {
    accessorKey: "assists",
    header: "A",
  },
  {
    accessorKey: "points",
    header: "P",
  },
  {
    accessorKey: "plusMinus",
    header: "+/-",
  },
  {
    accessorKey: "pim",
    header: "PIM",
  },
  {
    accessorKey: "shots",
    header: "SOG",
  },
  {
    accessorKey: "hits",
    header: "H",
  },
  {
    accessorKey: "blockedShots",
    header: "B",
  },
  {
    accessorKey: "faceoffWinningPctg",
    header: "F%",
  },
  {
    accessorKey: "toi",
    header: "TOI",
  },
  {
    accessorKey: "powerPlayToi",
    header: "PP TOI",
  },
  {
    accessorKey: "shorthandedToi",
    header: "SH TOI",
  },
];

export const goalieColumns: ColumnDef<GoalieStats>[] = [
  {
    accessorKey: "player",
    header: "Player",
    enablePinning: true,
    cell: ({ row }) => {
      const player = row.original;
      return player.name.default;
    },
  },
  {
    accessorKey: "saveShotsAgainst",
    header: "S",
  },
  {
    accessorKey: "savePctg",
    header: "%",
  },
  {
    accessorKey: "toi",
    header: "TOI",
  },
];
