import { ColumnDef } from "@tanstack/react-table";
import { PreviewPlayer, PreviewTotal } from "./preview-content";
import { TeamLogo } from "@/components/team-logo";
import PlayerLink from "@/components/player-link";
import { GameStatePopover } from "@/components/game-state-popover";
import { GamesNightStatus } from "@/context/games-night-context";

export const TotalPreviewColumn: ColumnDef<PreviewTotal>[] = [
  {
    accessorKey: "ranking",
    header: () => <GameStatePopover state={GamesNightStatus.NOT_STARTED} />,
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
    accessorKey: "forwardsPlaying",
    header: ({ table }) => table.options.meta?.t("ForwardsNb"),
  },
  {
    accessorKey: "defensePlaying",
    header: ({ table }) => table.options.meta?.t("DefenseNb"),
  },
  {
    accessorKey: "goaliesPlaying",
    header: ({ table }) => table.options.meta?.t("GoaliesNb"),
  },
  {
    accessorKey: "totalPlaying",
    header: "Total",
    accessorFn: (row) =>
      row.forwardsPlaying + row.defensePlaying + row.goaliesPlaying,
  },
];

export const PlayerPreviewColumn: ColumnDef<PreviewPlayer>[] = [
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
    cell: ({ row }) => {
      return <TeamLogo teamId={row.original.team} width={30} height={30} />;
    },
  },
  {
    accessorKey: "playingAgainst",
    header: "VS",
    cell: ({ row }) => {
      return row.original.playingAgainst ? (
        <TeamLogo teamId={row.original.playingAgainst} width={30} height={30} />
      ) : null;
    },
  },
];
