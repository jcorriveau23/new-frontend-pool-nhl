"use client";
import { ColumnDef } from "@tanstack/react-table";
import { TotalRanking } from "./cumulative-tab";
import { DataTableColumnHeader } from "@/components/ui/column-header";

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
      const ranking = row.original;
      return table.options.meta?.props?.dictUsers[ranking.participant];
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="PTS*" />
        ),
        accessorFn: (ranking) => ranking.getTotalPoolPoints(),
      },
      {
        accessorKey: "totalPoolPointsPerGame",
        header: ({ table }) => table.options.meta?.t("PTS*/G"),
        accessorFn: (ranking) =>
          (
            ranking.getTotalPoolPoints() /
            (ranking.forwards.numberOfGame +
              ranking.defense.numberOfGame +
              ranking.goalies.numberOfGame)
          ).toFixed(3),
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
      const ranking = row.original;
      return table.options.meta?.props?.dictUsers[ranking.participant];
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PTS*" />
    ),
    accessorFn: (ranking) => ranking.forwards.totalPoolPoints,
  },
  {
    accessorKey: "totalPoolPointsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS*/G"),
    accessorFn: (ranking) =>
      (
        ranking.forwards.totalPoolPoints / ranking.forwards.numberOfGame
      ).toFixed(3),
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
      const ranking = row.original;
      return table.options.meta?.props?.dictUsers[ranking.participant];
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PTS*" />
    ),
    accessorFn: (ranking) => ranking.defense.totalPoolPoints,
  },
  {
    accessorKey: "totalPoolPointsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS*/G"),
    accessorFn: (ranking) =>
      (ranking.defense.totalPoolPoints / ranking.defense.numberOfGame).toFixed(
        3
      ),
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
      const ranking = row.original;
      return table.options.meta?.props?.dictUsers[ranking.participant];
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PTS*" />
    ),
    accessorFn: (ranking) => ranking.goalies.totalPoolPoints,
  },
  {
    accessorKey: "totalPoolPointsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS*/G"),
    accessorFn: (ranking) =>
      (ranking.goalies.totalPoolPoints / ranking.goalies.numberOfGame).toFixed(
        3
      ),
  },
];
