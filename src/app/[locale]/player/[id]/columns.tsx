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
    header: "teamName",
    accessorFn: (row) => row.teamName.default,
  },
  {
    accessorKey: "leagueAbbrev",
    header: "leagueAbbrev",
  },
  {
    accessorKey: "gamesPlayed",
    header: "gamesPlayed",
  },
  {
    accessorKey: "goals",
    header: "goals",
  },
  {
    accessorKey: "assists",
    header: "assists",
  },
  {
    accessorKey: "points",
    header: "points",
  },
  {
    accessorKey: "plusMinus",
    header: "plusMinus",
  },
  {
    accessorKey: "pim",
    header: "pim",
  },
  {
    accessorKey: "plusMinus",
    header: "plusMinus",
  },
  {
    accessorKey: "plusMinus",
    header: "plusMinus",
  },
  {
    accessorKey: "plusMinus",
    header: "plusMinus",
  },
  {
    accessorKey: "plusMinus",
    header: "plusMinus",
  },
  {
    accessorKey: "plusMinus",
    header: "plusMinus",
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
    header: "teamName",
    accessorFn: (row) => row.teamName.default,
  },
  {
    accessorKey: "leagueAbbrev",
    header: "leagueAbbrev",
  },
  {
    accessorKey: "gamesPlayed",
    header: "gamesPlayed",
  },
  {
    accessorKey: "goalsAgainst",
    header: "goalsAgainst",
  },
  {
    accessorKey: "goalsAgainstAvg",
    header: "goalsAgainstAvg",
  },
  {
    accessorKey: "plusMinus",
    header: "plusMinus",
  },
  {
    accessorKey: "wins",
    header: "wins",
  },
  {
    accessorKey: "losses",
    header: "losses",
  },
  {
    accessorKey: "savePctg",
    header: "savePctg",
  },
  {
    accessorKey: "plusMinus",
    header: "plusMinus",
  },
];
