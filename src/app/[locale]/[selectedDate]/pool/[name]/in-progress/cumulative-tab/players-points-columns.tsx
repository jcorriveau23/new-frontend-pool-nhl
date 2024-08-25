"use client";

import { ColumnDef, TableMeta } from "@tanstack/react-table";

import { GoalieInfo, PlayerStatus, SkaterInfo } from "./cumulative-tab";
import { Pool } from "@/data/pool/model";
import PlayerLink from "@/components/player-link";
import { TeamLogo } from "@/components/team-logo";
import InformationIcon from "@/components/information-box";

const getWarningColor = (playerStatus: PlayerStatus) => {
  switch (playerStatus) {
    case PlayerStatus.InAlignment:
      return "green";
    case PlayerStatus.IsReservists:
      return "yellow";
    case PlayerStatus.PointsIgnored:
    case PlayerStatus.Traded:
      return "red";
  }
};

const getWarningMessage = (playerStatus: PlayerStatus) => {
  switch (playerStatus) {
    case PlayerStatus.InAlignment:
      return null;
    case PlayerStatus.IsReservists:
      return "is currently a reservist";
    case PlayerStatus.PointsIgnored:
      return "points are ignored";
    case PlayerStatus.Traded:
      return "was traded to another pooler";
  }
};

const getWarningCell = (
  player: SkaterInfo | GoalieInfo,
  meta: TableMeta<SkaterInfo> | TableMeta<GoalieInfo> | undefined
) => {
  if (player.status === PlayerStatus.InAlignment) {
    return null;
  }
  return (
    <InformationIcon
      text={`${meta?.props.context?.players[player.id].name} ${meta?.t(
        getWarningMessage(player.status)
      )}`}
    />
  );
};

const getPlayerCell = (player: SkaterInfo | GoalieInfo, poolInfo: Pool) => (
  <div className="w-[95px] sm:w-full">
    <PlayerLink
      name={poolInfo.context?.players[player.id].name}
      id={poolInfo.context?.players[player.id].id}
      textStyle={null}
    />
  </div>
);

const getTeamCell = (player: SkaterInfo | GoalieInfo, poolInfo: Pool) => (
  <TeamLogo
    teamId={poolInfo.context?.players[player.id].team}
    width={30}
    height={30}
  />
);

export const ForwardColumn: ColumnDef<SkaterInfo>[] = [
  {
    accessorKey: "number",
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
    accessorKey: "status",
    header: "",
    cell: ({ row, table }) => {
      return getWarningCell(row.original, table.options.meta);
    },
  },
  {
    accessorKey: "player",
    header: ({ table }) => table.options.meta?.t("Player"),
    cell: ({ row, table }) => {
      return getPlayerCell(row.original, table.options.meta?.props as Pool);
    },
  },
  {
    accessorKey: "team",
    header: ({ table }) => table.options.meta?.t("T"),
    cell: ({ row, table }) => {
      return getTeamCell(row.original, table.options.meta?.props as Pool);
    },
  },
  {
    accessorKey: "numberOfGame",
    header: ({ table }) => table.options.meta?.t("GP"),
    aggregationFn: "sum",
  },
  {
    accessorKey: "goals",
    header: ({ table }) => table.options.meta?.t("G"),
    aggregationFn: "sum",
  },
  {
    accessorKey: "assists",
    header: "A",
    aggregationFn: "sum",
  },
  {
    accessorKey: "points",
    header: "PTS",
    aggregationFn: "sum",
    accessorFn: (player) => player.getTotalPoints(),
  },
  {
    accessorKey: "hattricks",
    header: "HT",
    aggregationFn: "sum",
  },
  {
    accessorKey: "shootoutGoals",
    header: ({ table }) => table.options.meta?.t("G*"),
    aggregationFn: "sum",
  },
  {
    accessorKey: "poolPoints",
    header: "PTS*",
    aggregationFn: "sum",
  },
  {
    accessorKey: "totalPoolPtsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS*/G"),
    aggregationFn: "mean",
    accessorFn: (player) =>
      (player.poolPoints / player.numberOfGame).toFixed(3),
  },
];

export const DefenseColumn: ColumnDef<SkaterInfo>[] = [
  {
    accessorKey: "number",
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
    accessorKey: "status",
    header: "",
    cell: ({ row, table }) => {
      return getWarningCell(row.original, table.options.meta);
    },
  },
  {
    accessorKey: "player",
    header: ({ table }) => table.options.meta?.t("Player"),
    cell: ({ row, table }) => {
      return getPlayerCell(row.original, table.options.meta?.props as Pool);
    },
  },
  {
    accessorKey: "team",
    header: ({ table }) => table.options.meta?.t("T"),
    cell: ({ row, table }) => {
      return getTeamCell(row.original, table.options.meta?.props as Pool);
    },
  },
  {
    accessorKey: "numberOfGame",
    header: ({ table }) => table.options.meta?.t("GP"),
  },
  {
    accessorKey: "goals",
    header: ({ table }) => table.options.meta?.t("G"),
  },
  {
    accessorKey: "assists",
    header: "A",
  },
  {
    accessorKey: "points",
    header: "PTS",
    accessorFn: (player) => player.getTotalPoints(),
  },
  {
    accessorKey: "hattricks",
    header: "HT",
  },
  {
    accessorKey: "shootoutGoals",
    header: ({ table }) => table.options.meta?.t("G*"),
  },
  {
    accessorKey: "poolPoints",
    header: "PTS*",
  },
  {
    accessorKey: "totalPoolPtsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS*/G"),
    accessorFn: (player) =>
      (player.poolPoints / player.numberOfGame).toFixed(3),
  },
];

export const GoalieColumn: ColumnDef<GoalieInfo>[] = [
  {
    accessorKey: "number",
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
    accessorKey: "status",
    header: "",
    cell: ({ row, table }) => {
      return getWarningCell(row.original, table.options.meta);
    },
  },
  {
    accessorKey: "player",
    header: ({ table }) => table.options.meta?.t("Player"),
    cell: ({ row, table }) => {
      return getPlayerCell(row.original, table.options.meta?.props as Pool);
    },
  },
  {
    accessorKey: "team",
    header: ({ table }) => table.options.meta?.t("T"),
    cell: ({ row, table }) => {
      return getTeamCell(row.original, table.options.meta?.props as Pool);
    },
  },
  {
    accessorKey: "numberOfGame",
    header: ({ table }) => table.options.meta?.t("GP"),
  },
  {
    accessorKey: "wins",
    header: ({ table }) => table.options.meta?.t("W"),
  },
  {
    accessorKey: "shutouts",
    header: "SO*",
  },
  {
    accessorKey: "overtimeLosses",
    header: "OT*",
  },
  {
    accessorKey: "goals",
    header: ({ table }) => table.options.meta?.t("G"),
  },
  {
    accessorKey: "assists",
    header: "A",
  },
  {
    accessorKey: "poolPoints",
    header: "PTS*",
  },
  {
    accessorKey: "totalPoolPtsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS*/G"),
    accessorFn: (player) =>
      (player.poolPoints / player.numberOfGame).toFixed(3),
  },
];

export const ReservistColumn: ColumnDef<number>[] = [
  {
    accessorKey: "number",
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
    accessorKey: "player",
    header: ({ table }) => table.options.meta?.t("Player"),
    cell: ({ row, table }) => {
      const poolInfo = table.options.meta?.props as Pool;
      return poolInfo.context?.players[row.original].name;
    },
  },
  {
    accessorKey: "team",
    header: ({ table }) => table.options.meta?.t("T"),
    cell: ({ row, table }) => {
      const poolInfo = table.options.meta?.props as Pool;
      return (
        <TeamLogo
          teamId={poolInfo.context?.players[row.original].team}
          width={30}
          height={30}
        />
      );
    },
  },
  {
    accessorKey: "role",
    header: "R",
    cell: ({ row, table }) => {
      const poolInfo = table.options.meta?.props as Pool;
      return table.options.meta?.t(
        poolInfo.context?.players[row.original].position
      );
    },
  },
];
