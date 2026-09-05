"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Pool } from "@/data/pool/model";
import PlayerLink from "@/components/player-link";
import { TeamLogo } from "@/components/team-logo";
import { GoalieInfo, PlayerStatus, SkaterInfo } from "./cumulative-calculation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import PlayerSalary from "@/components/player-salary";

// Players that are not counted in the alignment are colour coded on the whole
// row instead of an extra information column: a left accent plus an opaque
// tint (opaque because pinned cells scroll over the other columns).
export const getPlayerStatusRowStyle = (
  playerStatus: PlayerStatus,
): string | null => {
  switch (playerStatus) {
    case PlayerStatus.InAlignment:
      return null;
    case PlayerStatus.IsReservists:
      return "border-l-2 border-l-chart-4 bg-[color-mix(in_oklab,var(--chart-4)_12%,var(--card))] hover:bg-[color-mix(in_oklab,var(--chart-4)_20%,var(--card))] group-hover:bg-[color-mix(in_oklab,var(--chart-4)_20%,var(--card))]";
    case PlayerStatus.Traded:
      return "border-l-2 border-l-destructive bg-[color-mix(in_oklab,var(--destructive)_12%,var(--card))] hover:bg-[color-mix(in_oklab,var(--destructive)_20%,var(--card))] group-hover:bg-[color-mix(in_oklab,var(--destructive)_20%,var(--card))]";
    case PlayerStatus.PointsIgnored:
      return "border-l-2 border-l-muted-foreground bg-muted text-muted-foreground hover:bg-muted group-hover:bg-muted";
  }
};

const getPlayerCell = (playerId: number, poolInfo: Pool) => (
  <div className="w-[95px] sm:w-full">
    <PlayerLink
      name={poolInfo.context?.players[playerId].name}
      id={poolInfo.context?.players[playerId].id}
      textStyle={null}
    />
  </div>
);

const getPlayerSalaryCell = (playerId: number, poolInfo: Pool) => (
  <PlayerSalary
    playerName={poolInfo.context?.players[playerId].name}
    team={poolInfo.context?.players[playerId].team}
    salary={poolInfo.context?.players[playerId].salary_cap}
    contractExpirationSeason={
      poolInfo.context?.players[playerId].contract_expiration_season
    }
    onBadgeClick={(e: React.MouseEvent) => {
      e.stopPropagation();
    }}
  />
);

const getTeamCell = (player: SkaterInfo | GoalieInfo, poolInfo: Pool) => (
  <TeamLogo
    teamId={poolInfo.context?.players[player.id].team ?? null}
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
    accessorKey: "player",
    header: ({ table }) => table.options.meta?.t("Player"),
    cell: ({ row, table }) => {
      return getPlayerCell(
        row.original.id,
        table.options.meta?.props?.poolInfo as Pool,
      );
    },
  },
  {
    accessorKey: "team",
    header: ({ table }) => table.options.meta?.t("T"),
    cell: ({ row, table }) => {
      return getTeamCell(
        row.original,
        table.options.meta?.props?.poolInfo as Pool,
      );
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
    header: "PTS",
    aggregationFn: "sum",
  },
  {
    accessorKey: "totalPoolPtsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS/G"),
    aggregationFn: "mean",
    accessorFn: (player) =>
      player.numberOfGame > 0
        ? (player.poolPoints / player.numberOfGame).toFixed(3)
        : null,
  },
  {
    accessorKey: "salary",
    header: "$",
    cell: ({ table, row }) => {
      return getPlayerSalaryCell(
        row.original.id,
        table.options.meta?.props?.poolInfo as Pool,
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    size: 48,
    cell: ({ table, row }) => {
      const player = row.original;
      const poolInfo = table.options.meta?.props?.poolInfo as Pool;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="size-4 p-0" />}
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                table.options.meta?.props?.setSelectedPlayerId(
                  player.id.toString(),
                );
                table.options.meta?.props?.setIsForwardChartOpen(true);
              }}
            >
              Chart
            </DropdownMenuItem>
            {/* Trades only exist in dynasty pools, like the trade tab itself. */}
            {poolInfo?.settings.dynasty_settings ? (
              <DropdownMenuItem
                onClick={() =>
                  table.options.meta?.props?.openTradeForPlayer?.(player.id)
                }
              >
                {table.options.meta?.t("FileTrade")}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
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
    accessorKey: "player",
    header: ({ table }) => table.options.meta?.t("Player"),
    cell: ({ row, table }) => {
      return getPlayerCell(
        row.original.id,
        table.options.meta?.props?.poolInfo as Pool,
      );
    },
  },
  {
    accessorKey: "team",
    header: ({ table }) => table.options.meta?.t("T"),
    cell: ({ row, table }) => {
      return getTeamCell(
        row.original,
        table.options.meta?.props?.poolInfo as Pool,
      );
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
    accessorKey: "hattricks",
    header: "HT",
  },
  {
    accessorKey: "shootoutGoals",
    header: ({ table }) => table.options.meta?.t("G*"),
  },
  {
    accessorKey: "poolPoints",
    header: "PTS",
  },
  {
    accessorKey: "totalPoolPtsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS/G"),
    accessorFn: (player) =>
      player.numberOfGame > 0
        ? (player.poolPoints / player.numberOfGame).toFixed(3)
        : null,
  },
  {
    accessorKey: "salary",
    header: "$",
    cell: ({ table, row }) => {
      return getPlayerSalaryCell(
        row.original.id,
        table.options.meta?.props?.poolInfo as Pool,
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    size: 48,
    cell: ({ table, row }) => {
      const player = row.original;
      const poolInfo = table.options.meta?.props?.poolInfo as Pool;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="size-4 p-0" />}
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                table.options.meta?.props?.setSelectedPlayerId(
                  player.id.toString(),
                );
                table.options.meta?.props?.setIsDefenderChartOpen(true);
              }}
            >
              Chart
            </DropdownMenuItem>
            {/* Trades only exist in dynasty pools, like the trade tab itself. */}
            {poolInfo?.settings.dynasty_settings ? (
              <DropdownMenuItem
                onClick={() =>
                  table.options.meta?.props?.openTradeForPlayer?.(player.id)
                }
              >
                {table.options.meta?.t("FileTrade")}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
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
    accessorKey: "player",
    header: ({ table }) => table.options.meta?.t("Player"),
    cell: ({ row, table }) => {
      return getPlayerCell(
        row.original.id,
        table.options.meta?.props?.poolInfo as Pool,
      );
    },
  },
  {
    accessorKey: "team",
    header: ({ table }) => table.options.meta?.t("T"),
    cell: ({ row, table }) => {
      return getTeamCell(
        row.original,
        table.options.meta?.props?.poolInfo as Pool,
      );
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
    header: "PTS",
  },
  {
    accessorKey: "totalPoolPtsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS/G"),
    accessorFn: (player) =>
      player.numberOfGame > 0
        ? (player.poolPoints / player.numberOfGame).toFixed(3)
        : null,
  },
  {
    accessorKey: "salary",
    header: "$",
    cell: ({ table, row }) => {
      return getPlayerSalaryCell(
        row.original.id,
        table.options.meta?.props?.poolInfo as Pool,
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    size: 48,
    cell: ({ table, row }) => {
      const player = row.original;
      const poolInfo = table.options.meta?.props?.poolInfo as Pool;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="size-4 p-0" />}
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                table.options.meta?.props?.setSelectedPlayerId(
                  player.id.toString(),
                );
                table.options.meta?.props?.setIsGoalieChartOpen(true);
              }}
            >
              Chart
            </DropdownMenuItem>
            {/* Trades only exist in dynasty pools, like the trade tab itself. */}
            {poolInfo?.settings.dynasty_settings ? (
              <DropdownMenuItem
                onClick={() =>
                  table.options.meta?.props?.openTradeForPlayer?.(player.id)
                }
              >
                {table.options.meta?.t("FileTrade")}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
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
      return getPlayerCell(row.original, table.options.meta?.props as Pool);
    },
  },
  {
    accessorKey: "team",
    header: ({ table }) => table.options.meta?.t("T"),
    cell: ({ row, table }) => {
      const poolInfo = table.options.meta?.props as Pool;
      return (
        <TeamLogo
          teamId={poolInfo.context?.players[row.original].team ?? null}
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
        poolInfo.context?.players[row.original].position,
      );
    },
  },
  {
    accessorKey: "salary",
    header: "$",
    cell: ({ row, table }) => {
      return getPlayerSalaryCell(
        row.original,
        table.options.meta?.props as Pool,
      );
    },
  },
];
