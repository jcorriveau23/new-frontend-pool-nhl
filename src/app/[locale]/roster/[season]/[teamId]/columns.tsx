"use client";

import PlayerLink from "@/components/player-link";
import { DataTableColumnHeader } from "@/components/ui/column-header";
import { ColumnDef } from "@tanstack/react-table";

export interface GoaliesSeasonStats {
  assists: number;
  gamesPlayed: number;
  gamesStarted: number;
  goalieFullName: string;
  goals: number;
  goalsAgainst: number;
  goalsAgainstAverage: number;
  lastName: string;
  losses: number;
  otLosses: number;
  penaltyMinutes: number;
  playerId: number;
  points: number;
  savePct: number;
  saves: number;
  seasonId: number;
  shootsCatches: string;
  shotsAgainst: number;
  shutouts: number;
  teamAbbrevs: string;
  ties: number | null;
  timeOnIce: number;
  wins: number;
}

export interface SkaterSeasonStats {
  assists: number;
  evGoals: number;
  evPoints: number;
  faceoffWinPct: number | null;
  gameWinningGoals: number;
  gamesPlayed: number;
  goals: number;
  lastName: string;
  otGoals: number;
  penaltyMinutes: number;
  playerId: number;
  plusMinus: number;
  points: number;
  pointsPerGame: number;
  positionCode: string;
  ppGoals: number;
  ppPoints: number;
  seasonId: number;
  shGoals: number;
  shPoints: number;
  shootingPct: number;
  shootsCatches: string;
  shots: number;
  skaterFullName: string;
  teamAbbrevs: string;
  timeOnIcePerGame: number;
}

export const skaterSeasonColumns: ColumnDef<SkaterSeasonStats>[] = [
  {
    accessorKey: "player",
    header: "Player",
    cell: ({ row }) => {
      const player = row.original;
      return (
        <div className="w-[100px] sm:w-100">
          <PlayerLink
            name={player.skaterFullName}
            id={player.playerId}
            textStyle={null}
          />
        </div>
      );
    },
  },
  {
    accessorKey: "positionCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="P" />,
  },
  {
    accessorKey: "gamesPlayed",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="GP" />
    ),
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PTS" />
    ),
  },
  {
    accessorKey: "plusMinus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="+/-" />
    ),
  },
  {
    accessorKey: "penaltyMinutes",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PIM" />
    ),
  },
  {
    accessorKey: "shots",
    header: ({ column }) => <DataTableColumnHeader column={column} title="S" />,
  },
  {
    accessorKey: "faceoffWinPct",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="F%" />
    ),
    accessorFn: (row) => row.faceoffWinPct?.toFixed(3),
  },
  {
    accessorKey: "timeOnIcePerGame",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="TOI" />
    ),
    accessorFn: (row) => row.timeOnIcePerGame?.toFixed(2),
  },
];

export const goaliesSeasonColumns: ColumnDef<GoaliesSeasonStats>[] = [
  {
    accessorKey: "player",
    header: "Player",
    cell: ({ row }) => {
      const player = row.original;
      return (
        <div className="w-[100px] sm:w-100">
          <PlayerLink
            name={player.goalieFullName}
            id={player.playerId}
            textStyle={null}
          />
        </div>
      );
    },
  },
  {
    accessorKey: "gamesPlayed",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="GP" />
    ),
  },
  {
    accessorKey: "wins",
    header: ({ column }) => <DataTableColumnHeader column={column} title="W" />,
  },
  {
    accessorKey: "losses",
    header: ({ column }) => <DataTableColumnHeader column={column} title="L" />,
  },
  {
    accessorKey: "otLosses",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="OT" />
    ),
  },
  {
    accessorKey: "shutouts",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SO" />
    ),
  },
  {
    accessorKey: "gamesStarted",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="GS" />
    ),
  },
  {
    accessorKey: "goals",
    header: ({ column }) => <DataTableColumnHeader column={column} title="G" />,
  },
  {
    accessorKey: "points",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PTS" />
    ),
  },
  {
    accessorKey: "goalsAgainst",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="GA" />
    ),
  },
  {
    accessorKey: "goalsAgainstAverage",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="GAA" />
    ),
    accessorFn: (row) => row.goalsAgainstAverage.toFixed(3),
  },
  {
    accessorKey: "savePct",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="S%" />
    ),
    accessorFn: (row) => row.savePct?.toFixed(3),
  },
  {
    accessorKey: "saves",
    header: ({ column }) => <DataTableColumnHeader column={column} title="S" />,
  },
];
