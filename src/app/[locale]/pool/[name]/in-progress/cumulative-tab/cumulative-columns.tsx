"use client";
import { ColumnDef } from "@tanstack/react-table";
import { TotalRanking } from "./cumulative-tab";

export const TotalPointsColumn: ColumnDef<TotalRanking>[] = [
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
    accessorKey: "pooler",
    header: "Pooler",
    cell: ({ row, table }) => {
      return row.original.participant;
    },
  },
  {
    id: "1",
    header: ({ table }) => table.options.meta?.t("Forwards"),
    columns: [
      {
        accessorKey: "forwardGamePlayed",
        header: ({ table }) => table.options.meta?.t("GP"),
        accessorFn: (ranking) => ranking.forwards.numberOfGame,
      },
      {
        accessorKey: "forwardPoints",
        header: "PTS*",
        accessorFn: (ranking) => ranking.forwards.totalPoolPoints,
      },
    ],
  },
  {
    id: "2",
    header: ({ table }) => table.options.meta?.t("Defense"),
    columns: [
      {
        accessorKey: "defenseGamePlayed",
        header: ({ table }) => table.options.meta?.t("GP"),
        accessorFn: (ranking) => ranking.defense.numberOfGame,
      },
      {
        accessorKey: "defensePoints",
        header: "PTS*",
        accessorFn: (ranking) => ranking.defense.totalPoolPoints,
      },
    ],
  },
  {
    id: "3",
    header: ({ table }) => table.options.meta?.t("Goalies"),
    columns: [
      {
        accessorKey: "goaliesGamePlayed",
        header: ({ table }) => table.options.meta?.t("GP"),
        accessorFn: (ranking) => ranking.goalies.numberOfGame,
      },
      {
        accessorKey: "goaliesPoints",
        header: "PTS*",
        accessorFn: (ranking) => ranking.goalies.totalPoolPoints,
      },
    ],
  },
  {
    id: "4",
    header: ({ table }) => table.options.meta?.t("Total"),
    columns: [
      {
        accessorKey: "gamePlayed",
        header: ({ table }) => table.options.meta?.t("GP"),
        accessorFn: (ranking) =>
          ranking.forwards.numberOfGame +
          ranking.defense.numberOfGame +
          ranking.goalies.numberOfGame,
      },
      {
        accessorKey: "totalPoolPoints",
        header: "PTS*",
        accessorFn: (ranking) => ranking.getTotalPoolPoints(),
      },
      {
        accessorKey: "totalPoolPointsPerGame",
        header: ({ table }) => table.options.meta?.t("PTS*/G"),
        accessorFn: (ranking) => {
          const totalNumberOfGame =
            ranking.forwards.numberOfGame +
            ranking.defense.numberOfGame +
            ranking.goalies.numberOfGame;
          return totalNumberOfGame > 0
            ? (ranking.getTotalPoolPoints() / totalNumberOfGame).toFixed(3)
            : null;
        },
      },
    ],
  },
];

export const ForwardsTotalColumn: ColumnDef<TotalRanking>[] = [
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
    accessorKey: "pooler",
    header: "Pooler",
    cell: ({ row, table }) => {
      return row.original.participant;
    },
  },
  {
    accessorKey: "gamePlayed",
    header: ({ table }) => table.options.meta?.t("GP"),
    accessorFn: (ranking) => ranking.forwards.numberOfGame,
  },
  {
    accessorKey: "goals",
    header: ({ table }) => table.options.meta?.t("G"),
    accessorFn: (ranking) => ranking.forwards.goals,
  },
  {
    accessorKey: "assists",
    header: "A",
    accessorFn: (ranking) => ranking.forwards.assists,
  },
  {
    accessorKey: "totalPoints",
    header: "PTS",
    accessorFn: (ranking) => ranking.forwards.getTotalPoints(),
  },
  {
    accessorKey: "hattricks",
    header: "HT",
    accessorFn: (ranking) => ranking.forwards.hattricks,
  },
  {
    accessorKey: "shootoutGoals",
    header: ({ table }) => table.options.meta?.t("G*"),
    accessorFn: (ranking) => ranking.forwards.shootoutGoals,
  },
  {
    accessorKey: "totalPoolPoints",
    header: "PTS*",
    accessorFn: (ranking) => ranking.forwards.totalPoolPoints,
  },
  {
    accessorKey: "totalPoolPointsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS*/G"),
    accessorFn: (ranking) =>
      ranking.forwards.numberOfGame > 0
        ? (
            ranking.forwards.totalPoolPoints / ranking.forwards.numberOfGame
          ).toFixed(3)
        : null,
  },
];

export const DefensesTotalColumn: ColumnDef<TotalRanking>[] = [
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
    accessorKey: "pooler",
    header: "Pooler",
    cell: ({ row, table }) => {
      return row.original.participant;
    },
  },
  {
    accessorKey: "gamePlayed",
    header: ({ table }) => table.options.meta?.t("GP"),
    accessorFn: (ranking) => ranking.defense.numberOfGame,
  },
  {
    accessorKey: "goals",
    header: ({ table }) => table.options.meta?.t("G"),
    accessorFn: (ranking) => ranking.defense.goals,
  },
  {
    accessorKey: "assists",
    header: "A",
    accessorFn: (ranking) => ranking.defense.assists,
  },
  {
    accessorKey: "totalPoints",
    header: "PTS",
    accessorFn: (ranking) => ranking.defense.getTotalPoints(),
  },
  {
    accessorKey: "hattricks",
    header: "HT",
    accessorFn: (ranking) => ranking.defense.hattricks,
  },
  {
    accessorKey: "shootoutGoals",
    header: ({ table }) => table.options.meta?.t("G*"),
    accessorFn: (ranking) => ranking.defense.shootoutGoals,
  },
  {
    accessorKey: "totalPoolPoints",
    header: "PTS*",
    accessorFn: (ranking) => ranking.defense.totalPoolPoints,
  },
  {
    accessorKey: "totalPoolPointsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS*/G"),
    accessorFn: (ranking) =>
      ranking.defense.numberOfGame > 0
        ? (
            ranking.defense.totalPoolPoints / ranking.defense.numberOfGame
          ).toFixed(3)
        : null,
  },
];

export const GoaliesTotalColumn: ColumnDef<TotalRanking>[] = [
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
    accessorKey: "pooler",
    header: "Pooler",
    cell: ({ row, table }) => {
      return row.original.participant;
    },
  },
  {
    accessorKey: "gamePlayed",
    header: ({ table }) => table.options.meta?.t("GP"),
    accessorFn: (ranking) => ranking.goalies.numberOfGame,
  },
  {
    accessorKey: "wins",
    header: ({ table }) => table.options.meta?.t("W"),
    accessorFn: (ranking) => ranking.goalies.wins,
  },
  {
    accessorKey: "shutout",
    header: "SO",
    accessorFn: (ranking) => ranking.goalies.shutouts,
  },
  {
    accessorKey: "overtimeLosses",
    header: "OT",
    accessorFn: (ranking) => ranking.goalies.overtimeLosses,
  },
  {
    accessorKey: "goals",
    header: ({ table }) => table.options.meta?.t("G"),
    accessorFn: (ranking) => ranking.goalies.goals,
  },
  {
    accessorKey: "assists",
    header: "A",
    accessorFn: (ranking) => ranking.goalies.assists,
  },
  {
    accessorKey: "totalPoolPoints",
    header: "PTS*",
    accessorFn: (ranking) => ranking.goalies.totalPoolPoints,
  },
  {
    accessorKey: "totalPoolPointsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS*/G"),
    accessorFn: (ranking) =>
      ranking.goalies.numberOfGame > 0
        ? (
            ranking.goalies.totalPoolPoints / ranking.goalies.numberOfGame
          ).toFixed(3)
        : null,
  },
];
