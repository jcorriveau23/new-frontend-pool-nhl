import { ColumnDef } from "@tanstack/react-table";
import {
  SkaterDailyInfo,
  GoalieDailyInfo,
  TotalDailyPoints,
} from "@/lib/scoring";
import { Pool } from "@/data/pool/model";
import { DailyGoalie, DailySkater } from "@/data/dailyLeaders/model";
import { TeamLogo } from "@/components/team-logo";
import PlayerLink from "@/components/player-link";
import { PoolerName } from "@/components/pooler-name";
import { GameStatus, Matchup } from "@/components/game-status";
import { Game } from "@/data/nhl/game";

/*
What the roster tables need beyond the day's stat line: the pool, to turn a
player id into a name and a team, and the night's schedule, to say who that
team is up against. A pooler reading a half-played night wants both — a zero
means something different when the player is on at 22:00 than when their team
is not on the schedule at all.
*/
export interface DailyPlayerTableProps {
  poolInfo: Pool;
  gameByTeam: Record<number, Game>;
}

const getPlayerTeam = (
  player: SkaterDailyInfo | GoalieDailyInfo,
  poolInfo: Pool,
) => poolInfo.context?.players[player.id]?.team ?? null;

const getPlayerGame = (
  player: SkaterDailyInfo | GoalieDailyInfo,
  props: DailyPlayerTableProps,
): Game | null => {
  const team = getPlayerTeam(player, props.poolInfo);
  return team === null ? null : (props.gameByTeam[team] ?? null);
};

const getPlayerCell = (
  player: SkaterDailyInfo | GoalieDailyInfo,
  poolInfo: Pool,
) => (
  <div className="w-[105px] sm:w-auto">
    <PlayerLink
      name={poolInfo.context?.players[player.id].name}
      id={poolInfo.context?.players[player.id].id}
      textStyle={null}
    />
  </div>
);

const getTeamCell = (
  player: SkaterDailyInfo | GoalieDailyInfo,
  poolInfo: Pool,
) => (
  <TeamLogo
    teamId={poolInfo.context?.players[player.id].team ?? null}
    width={22}
    height={22}
  />
);

/*
The matchup and the clock, in the shape both roster tables use them. Declared
once rather than twice: the skater table and the goalie table differ in their
stat lines, not in the night their players are playing.
*/
function matchupColumns<
  TData extends SkaterDailyInfo | GoalieDailyInfo,
>(): ColumnDef<TData>[] {
  // Neither sorts: the opponent and the clock both live on the night's
  // schedule, which an accessor cannot reach from a row alone.
  return [
    {
      id: "opponent",
      enableSorting: false,
      header: ({ table }) => table.options.meta?.t("Opponent"),
      cell: ({ row, table }) => {
        const props = table.options.meta?.props as DailyPlayerTableProps;
        return (
          <Matchup
            game={getPlayerGame(row.original, props)}
            teamId={getPlayerTeam(row.original, props.poolInfo)}
          />
        );
      },
    },
    {
      id: "gameStatus",
      enableSorting: false,
      header: ({ table }) => table.options.meta?.t("Game"),
      cell: ({ row, table }) => {
        const props = table.options.meta?.props as DailyPlayerTableProps;
        return <GameStatus game={getPlayerGame(row.original, props)} />;
      },
    },
  ];
}

export const SkaterDailyColumn: ColumnDef<SkaterDailyInfo>[] = [
  {
    accessorKey: "player",
    header: "Player",
    cell: ({ row, table }) => {
      const props = table.options.meta?.props as DailyPlayerTableProps;
      return getPlayerCell(row.original, props.poolInfo);
    },
  },
  {
    accessorKey: "team",
    // Named rather than blank: the column picker lists it by its header, and
    // an unlabelled entry there is one the pooler cannot put back.
    header: ({ table }) => table.options.meta?.t("T"),
    cell: ({ row, table }) => {
      const props = table.options.meta?.props as DailyPlayerTableProps;
      return getTeamCell(row.original, props.poolInfo);
    },
  },
  ...matchupColumns<SkaterDailyInfo>(),
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
    header: "PTS",
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
      const props = table.options.meta?.props as DailyPlayerTableProps;
      return getPlayerCell(row.original, props.poolInfo);
    },
  },
  {
    accessorKey: "team",
    // Named rather than blank: the column picker lists it by its header, and
    // an unlabelled entry there is one the pooler cannot put back.
    header: ({ table }) => table.options.meta?.t("T"),
    cell: ({ row, table }) => {
      const props = table.options.meta?.props as DailyPlayerTableProps;
      return getTeamCell(row.original, props.poolInfo);
    },
  },
  ...matchupColumns<GoalieDailyInfo>(),
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
    header: "PTS",
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
    cell: ({ row }) => <PoolerName name={row.original.participant} />,
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
        header: "PTS",
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
        header: "PTS",
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
        header: "PTS",
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
        header: "PTS",
        accessorFn: (ranking) => ranking.totalPoolPoints,
      },
      {
        accessorKey: "totalPoolPointsPerGame",
        header: ({ table }) => table.options.meta?.t("PTS/G"),
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
    cell: ({ row }) => <PoolerName name={row.original.participant} />,
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
    header: "PTS",
    accessorFn: (ranking) => ranking.forwards.totalPoolPoints,
  },
  {
    accessorKey: "totalPoolPointsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS/G"),
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
    cell: ({ row }) => <PoolerName name={row.original.participant} />,
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
    header: "PTS",
    accessorFn: (ranking) => ranking.defense.totalPoolPoints,
  },
  {
    accessorKey: "totalPoolPointsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS/G"),
    accessorFn: (ranking) =>
      (ranking.defense.totalPoolPoints / ranking.defense.numberOfGame).toFixed(
        3,
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
    cell: ({ row }) => <PoolerName name={row.original.participant} />,
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
    header: "PTS",
    accessorFn: (ranking) => ranking.goalies.totalPoolPoints,
  },
  {
    accessorKey: "totalPoolPointsPerGame",
    header: ({ table }) => table.options.meta?.t("PTS/G"),
    accessorFn: (ranking) =>
      (ranking.goalies.totalPoolPoints / ranking.goalies.numberOfGame).toFixed(
        3,
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
      <TeamLogo teamId={row.original.team} width={22} height={22} />
    ),
  },
  {
    accessorKey: "owner",
    header: ({ table }) => table.options.meta?.t("Owner"),
    cell: ({ row, table }) => {
      const owner = table.options.meta?.props.playersOwner[row.original.id];
      return owner ?? null;
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
      <TeamLogo teamId={row.original.team} width={22} height={22} />
    ),
  },
  {
    accessorKey: "owner",
    header: ({ table }) => table.options.meta?.t("Owner"),
    cell: ({ row, table }) => {
      const owner = table.options.meta?.props.playersOwner[row.original.id];
      return owner ?? null;
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
