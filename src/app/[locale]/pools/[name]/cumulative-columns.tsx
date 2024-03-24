"use client";
import { ColumnDef } from "@tanstack/react-table";
import { TotalRanking } from "./cumulative-tab";
import { DataTableColumnHeader } from "@/components/ui/column-header";
import { Props } from "./cumulative-tab";

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
      return (table.options.meta?.props as Props)?.dictUsers[
        ranking.participant
      ];
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
        accessorFn: (ranking) => ranking.forwards.totalPoolPts,
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
        accessorFn: (ranking) => ranking.defenses.numberOfGame,
      },
      {
        accessorKey: "defensePoints",
        header: "PTS*",
        accessorFn: (ranking) => ranking.defenses.totalPoolPts,
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
        accessorFn: (ranking) => ranking.goalies.totalPoolPts,
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
          ranking.defenses.numberOfGame +
          ranking.goalies.numberOfGame,
      },
      {
        accessorKey: "totalPoolPts",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="PTS*" />
        ),
        accessorFn: (ranking) => ranking.getTotalPoolPts(),
      },
      {
        accessorKey: "totalPoolPtsPerGame",
        header: ({ table }) => table.options.meta?.t("PTS*/G"),
        accessorFn: (ranking) =>
          (
            ranking.getTotalPoolPts() /
            (ranking.forwards.numberOfGame +
              ranking.defenses.numberOfGame +
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
      return (table.options.meta?.props as Props)?.dictUsers[
        ranking.participant
      ];
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
    accessorKey: "totalPts",
    header: "PTS",
    accessorFn: (ranking) => ranking.forwards.getTotalPts(),
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
    accessorKey: "totalPoolPts",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PTS*" />
    ),
    accessorFn: (ranking) => ranking.forwards.totalPoolPts,
  },
  {
    accessorKey: "totalPoolPtsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS*/G"),
    accessorFn: (ranking) =>
      (ranking.forwards.totalPoolPts / ranking.forwards.numberOfGame).toFixed(
        3
      ),
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
      return (table.options.meta?.props as Props)?.dictUsers[
        ranking.participant
      ];
    },
  },
  {
    accessorKey: "gamePlayed",
    header: ({ table }) => table.options.meta?.t("GP"),
    accessorFn: (ranking) => ranking.defenses.numberOfGame,
  },
  {
    accessorKey: "goals",
    header: ({ table }) => table.options.meta?.t("G"),
    accessorFn: (ranking) => ranking.defenses.goals,
  },
  {
    accessorKey: "assists",
    header: "A",
    accessorFn: (ranking) => ranking.defenses.assists,
  },
  {
    accessorKey: "totalPts",
    header: "PTS",
    accessorFn: (ranking) => ranking.defenses.getTotalPts(),
  },
  {
    accessorKey: "hattricks",
    header: "HT",
    accessorFn: (ranking) => ranking.defenses.hattricks,
  },
  {
    accessorKey: "shootoutGoals",
    header: ({ table }) => table.options.meta?.t("G*"),
    accessorFn: (ranking) => ranking.defenses.shootoutGoals,
  },
  {
    accessorKey: "totalPoolPts",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PTS*" />
    ),
    accessorFn: (ranking) => ranking.defenses.totalPoolPts,
  },
  {
    accessorKey: "totalPoolPtsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS*/G"),
    accessorFn: (ranking) =>
      (ranking.defenses.totalPoolPts / ranking.defenses.numberOfGame).toFixed(
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
      return (table.options.meta?.props as Props)?.dictUsers[
        ranking.participant
      ];
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
    accessorKey: "totalPoolPts",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PTS*" />
    ),
    accessorFn: (ranking) => ranking.goalies.totalPoolPts,
  },
  {
    accessorKey: "totalPoolPtsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS*/G"),
    accessorFn: (ranking) =>
      (ranking.goalies.totalPoolPts / ranking.goalies.numberOfGame).toFixed(3),
  },
];
