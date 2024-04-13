"use client";
import { ColumnDef } from "@tanstack/react-table";
import { GoaliesSeasonTotal, SkaterSeasonTotal } from "./page";

export const skaterColumns: ColumnDef<
  SkaterSeasonTotal | GoaliesSeasonTotal
>[] = [
  {
    accessorKey: "season",
    header: "season",
    accessorFn: (row) =>
      `${row.season.toString().slice(0, 4)}-${row.season.toString().slice(6)}`,
  },
  {
    accessorKey: "teamName",
    header: "T.",
    accessorFn: (row) => row.teamName.default,
  },
  {
    accessorKey: "gamesPlayed",
    header: "GP",
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
    header: "PTS",
  },
  {
    accessorKey: "plusMinus",
    header: "+/-",
  },
  {
    accessorKey: "pim",
    header: "pim",
  },
];

export const goalieColumns: ColumnDef<
  GoaliesSeasonTotal | SkaterSeasonTotal
>[] = [
  {
    accessorKey: "season",
    header: "season",
    accessorFn: (row) =>
      `${row.season.toString().slice(0, 4)}-${row.season.toString().slice(6)}`,
  },
  {
    accessorKey: "teamName",
    header: "T.",
    accessorFn: (row) => row.teamName.default,
  },
  {
    accessorKey: "gamesPlayed",
    header: "GP",
  },
  {
    accessorKey: "goalsAgainst",
    header: "GA",
  },
  {
    accessorKey: "goalsAgainstAvg",
    header: "GAVV",
  },
  {
    accessorKey: "wins",
    header: "W",
  },
  {
    accessorKey: "losses",
    header: "L",
  },
  {
    accessorKey: "savePctg",
    header: "S%",
  },
];
