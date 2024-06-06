"use client";
import { ColumnDef } from "@tanstack/react-table";
import { GoaliesSeasonTotal, SkaterSeasonTotal } from "./page";
import { seasonFormat } from "@/app/utils/formating";

export const skaterColumns: ColumnDef<
  SkaterSeasonTotal | GoaliesSeasonTotal
>[] = [
  {
    accessorKey: "season",
    header: "season",
    accessorFn: (row) => seasonFormat(row.season, 0),
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
    accessorFn: (row) => seasonFormat(row.season, 0),
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
