import { ColumnDef } from "@tanstack/react-table";
import {
  SkaterDailyInfo,
  GoalieDailyInfo,
  TotalDailyPoints,
} from "./stats-content";
import { Pool } from "@/data/pool/model";
import { DailyGoalie, DailySkater } from "@/data/dailyLeaders/model";
import { TeamLogo } from "@/components/team-logo";
import PlayerLink from "@/components/player-link";

const getPlayerCell = (
  player: SkaterDailyInfo | GoalieDailyInfo,
  poolInfo: Pool
) => (
  <div>
    <span>
      <PlayerLink
        name={poolInfo.context?.players[player.id].name}
        id={poolInfo.context?.players[player.id].id}
        textStyle={null}
      />
    </span>
  </div>
);

const getTeamCell = (
  player: SkaterDailyInfo | GoalieDailyInfo,
  poolInfo: Pool
) => (
  <TeamLogo
    teamId={poolInfo.context?.players[player.id].team ?? null}
    width={30}
    height={30}
  />
);

export const SkaterDailyColumn: ColumnDef<SkaterDailyInfo>[] = [
  {
    accessorKey: "player",
    header: "Player",
    cell: ({ row, table }) => {
      return getPlayerCell(row.original, table.options.meta?.props as Pool);
    },
  },
  {
    accessorKey: "team",
    header: "",
    cell: ({ row, table }) => {
      return getTeamCell(row.original, table.options.meta?.props as Pool);
    },
  },
  {
    accessorKey: "goals",
    header: "G",
    accessorFn: (row) => (row.played ? row.goals : null),
  },
  {
    accessorKey: "assists",
    header: "A",
    accessorFn: (row) => (row.played ? row.assists : null),
  },
  {
    accessorKey: "shootoutGoals",
    header: "G*",
    accessorFn: (row) => (row.played ? row.shootoutGoals : null),
  },
  {
    accessorKey: "poolPoints",
    header: "PTS*",
    accessorFn: (row) => (row.played ? row.poolPoints : null),
    sortingFn: (row1, row2) => {
      const player1 = row1.original;
      const player2 = row2.original;

      return (
        player1.poolPoints +
        Number(player1.played) * 0.01 -
        (player2.poolPoints + Number(player2.played) * 0.01)
      );
    },
  },
];

export const GoaliesColumn: ColumnDef<GoalieDailyInfo>[] = [
  {
    accessorKey: "player",
    header: "Player",
    cell: ({ row, table }) => {
      return getPlayerCell(row.original, table.options.meta?.props as Pool);
    },
  },
  {
    accessorKey: "team",
    header: "",
    cell: ({ row, table }) => {
      return getTeamCell(row.original, table.options.meta?.props as Pool);
    },
  },
  {
    accessorKey: "goals",
    header: "G",
    accessorFn: (row) => (row.played ? row.goals : null),
  },
  {
    accessorKey: "assists",
    header: "A",
    accessorFn: (row) => (row.played ? row.assists : null),
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "poolPoints",
    header: "PTS*",
    accessorFn: (row) => (row.played ? row.poolPoints : null),
    sortingFn: (row1, row2) => {
      const player1 = row1.original;
      const player2 = row2.original;

      return (
        player1.poolPoints +
        Number(player1.played) * 0.01 -
        (player2.poolPoints + Number(player2.played) * 0.01)
      );
    },
  },
];

export const TotalDailyColumn: ColumnDef<TotalDailyPoints>[] = [
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
    cell: ({ row }) => {
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
        accessorFn: (ranking) => ranking.totalPoolPoints,
      },
      {
        accessorKey: "totalPoolPointsPerGame",
        header: ({ table }) => table.options.meta?.t("PTS*/G"),
        accessorFn: (ranking) => {
          const numberOfGame =
            ranking.forwards.numberOfGame +
            ranking.defense.numberOfGame +
            ranking.goalies.numberOfGame;
          return (
            numberOfGame ? ranking.totalPoolPoints / numberOfGame : 0
          ).toFixed(3);
        },
      },
    ],
  },
];

export const ForwardsDailyTotalColumn: ColumnDef<TotalDailyPoints>[] = [
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
    accessorFn: (ranking) => ranking.forwards.totalPoints,
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
      (
        ranking.forwards.totalPoolPoints / ranking.forwards.numberOfGame
      ).toFixed(3),
  },
];

export const DefensesDailyTotalColumn: ColumnDef<TotalDailyPoints>[] = [
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
    accessorFn: (ranking) => ranking.defense.totalPoints,
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
      (ranking.defense.totalPoolPoints / ranking.defense.numberOfGame).toFixed(
        3
      ),
  },
];

export const GoaliesDailyTotalColumn: ColumnDef<TotalDailyPoints>[] = [
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
      (ranking.goalies.totalPoolPoints / ranking.goalies.numberOfGame).toFixed(
        3
      ),
  },
];

export const DailyScoringLeadersColumn: ColumnDef<DailySkater>[] = [
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
    accessorKey: "name",
    header: ({ table }) => table.options.meta?.t("Player"),
    cell: ({ row }) => {
      return (
        <PlayerLink
          name={row.original.name}
          id={row.original.id}
          textStyle={null}
        />
      );
    },
  },
  {
    accessorKey: "team",
    header: ({ table }) => table.options.meta?.t("T"),
    cell: ({ row }) => (
      <TeamLogo teamId={row.original.team} width={30} height={30} />
    ),
  },
  {
    accessorKey: "owner",
    header: ({ table }) => table.options.meta?.t("Owner"),
    cell: ({ row, table }) => {
      const owner = table.options.meta?.props.playersOwner[row.original.id];
      return owner ? table.options.meta?.props.dictUsers[owner].name : null;
    },
  },
  {
    accessorKey: "goals",
    header: ({ table }) => table.options.meta?.t("G"),
    accessorFn: (row) => row.stats.goals,
  },
  {
    accessorKey: "assists",
    header: "A",
    accessorFn: (row) => row.stats.assists,
  },
  {
    accessorKey: "points",
    header: "PTS",
    accessorFn: (row) => row.stats.goals + row.stats.assists,
  },
];

export const DailyGoaliesLeadersColumn: ColumnDef<DailyGoalie>[] = [
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
    accessorKey: "name",
    header: ({ table }) => table.options.meta?.t("Player"),
    cell: ({ row }) => {
      return (
        <PlayerLink
          name={row.original.name}
          id={row.original.id}
          textStyle={null}
        />
      );
    },
  },
  {
    accessorKey: "team",
    header: ({ table }) => table.options.meta?.t("T"),
    cell: ({ row }) => (
      <TeamLogo teamId={row.original.team} width={30} height={30} />
    ),
  },
  {
    accessorKey: "owner",
    header: ({ table }) => table.options.meta?.t("Owner"),
    cell: ({ row, table }) => {
      const owner = table.options.meta?.props.playersOwner[row.original.id];
      return owner ? table.options.meta?.props.dictUsers[owner].name : null;
    },
  },
  {
    accessorKey: "decision",
    header: "",
    accessorFn: (row) => row.stats.decision,
  },
  {
    accessorKey: "savePercentage",
    header: ({ table }) => table.options.meta?.t("s%"),
    accessorFn: (row) => row.stats.savePercentage,
  },
];
