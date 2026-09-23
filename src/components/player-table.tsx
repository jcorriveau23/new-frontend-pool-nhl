"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { fetchPlayers, searchPlayers } from "@/lib/client-data";
import { Player } from "@/data/pool/model";
import {
  comparePlayersBy,
  DEFAULT_PAGE_SIZE,
  filterByPositions,
  isSearchActive,
  movePage,
  MINIMUM_SEARCH_CHARACTERS,
  PlayerQueryState,
  SEARCH_DEBOUNCE_MS,
  showGoalieColumns,
  sortByColumn,
} from "@/lib/player-table-query";
import PlayerLink from "./player-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamLogo } from "./team-logo";
import { useTranslations } from "next-intl";
import { Combobox } from "./ui/combobox";
import { TableSkeleton } from "./ui/table-skeleton";
import PlayerSalary from "./player-salary";
import SortHeaderCell from "./sort-header-cell";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";

const RANK_CELL = "w-8 sm:w-12 sm:sticky sm:left-0 sm:z-[1]";
const NAME_CELL = "sticky left-0 z-[1] max-w-[36vw] sm:left-12 sm:max-w-xs";
const STICKY_BG = "bg-background group-hover:bg-muted/50";
// A player a pooler already holds stays in the list -- you still want to look
// them up -- but the whole row is greyed out so the eye skips it while scanning
// for who is left. These backgrounds have to be opaque: the rank and name cells
// paint their own to scroll under, and a translucent one would stack on top of
// the row's and come out a shade darker than the rest of the row.
const TAKEN_ROW = "bg-muted text-muted-foreground hover:bg-accent";
const TAKEN_STICKY_BG = "bg-muted group-hover:bg-accent";
// In light mode `muted` sits only a few percent off the page background, which
// is easy to miss on a row of numbers, so the state also gets an edge marker.
const TAKEN_MARKER = "border-l-2 border-l-muted-foreground/40";
// A phone has to fit a dozen stat columns, so they run tighter and smaller
// there and only relax at sm. Anything wider than this and the columns the
// user came for are pushed off screen.
const STAT_CELL = "px-1 text-[11px] sm:px-2 sm:text-sm";

interface PlayersTableProps {
  sortField: string | null;
  skip: number | null;
  limit: number | null;
  considerOnlyProtected: boolean;
  pushUrl: string; // /players/... || /pool/{name}/...
  playersOwner: Record<string, string> | null; // maps player id to pooler name
  protectedPlayers: Record<string, string> | null; // maps player id to pooler name
  onPlayerSelect: ((player: Player) => Promise<boolean>) | null;
  // Season being played, in the 20252026 format. Turns a contract expiration
  // into a remaining term on the cap hit; omitted, only the amount shows.
  currentSeason?: number;
}

interface PlayerColumn {
  key: string; // sort key, also used as react key.
  label: string;
  sortable: boolean;
  align: "left" | "right";
  render: (player: Player) => React.ReactNode;
}

const PlayersTable: React.FC<PlayersTableProps> = ({
  sortField: initialSortField,
  skip: initialSkip,
  limit: initialLimit,
  considerOnlyProtected,
  pushUrl,
  playersOwner,
  protectedPlayers,
  onPlayerSelect,
  currentSeason,
}) => {
  const searchParams = useSearchParams();
  const queryParams = new URLSearchParams(searchParams.toString());
  const positionsParams = queryParams.getAll("positions");

  const [sortField, setSortField] = useState<string | null>(
    queryParams.get("sortField") ?? initialSortField,
  );
  const [descendingOrder, setDescendingOrder] = useState<boolean>(
    (queryParams.get("descendingOrder") ?? "true") === "true",
  );
  const [skip, setSkip] = useState<number>(
    Number(queryParams.get("skip") ?? initialSkip ?? 0),
  );
  const [selectedPositions, setSelectedPositions] = useState<string[]>(
    positionsParams.length ? positionsParams : ["F", "D"],
  );
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const t = useTranslations();

  const pageSize = initialLimit ?? DEFAULT_PAGE_SIZE;

  const queryState: PlayerQueryState = {
    sortField,
    descendingOrder,
    skip,
    positions: selectedPositions,
  };

  // Debounced so typing a name does not fire a request per keystroke.
  useEffect(() => {
    const trimmed = searchInput.trim();
    const timeout = setTimeout(
      () => setSearchTerm(trimmed),
      trimmed.length >= MINIMUM_SEARCH_CHARACTERS ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const searchActive = isSearchActive(searchTerm);

  const listQuery = useQuery({
    queryKey: [
      "players",
      selectedPositions,
      sortField,
      descendingOrder,
      skip,
      pageSize,
    ],
    queryFn: () =>
      fetchPlayers({
        positions: selectedPositions,
        sort: sortField,
        descending: descendingOrder,
        skip,
        limit: pageSize,
      }),
    enabled: !searchActive,
    placeholderData: keepPreviousData,
  });

  const searchQuery = useQuery({
    queryKey: ["players-search", searchTerm],
    queryFn: () => searchPlayers(searchTerm),
    enabled: searchActive,
    placeholderData: keepPreviousData,
  });

  const activeQuery = searchActive ? searchQuery : listQuery;

  const players = useMemo(() => {
    if (!searchActive) return listQuery.data ?? [];

    // Searching by name deliberately ignores the position filter: looking up a
    // goalie while the list is filtered on skaters should find them, not
    // return nothing. The sorted column still applies, client side, since the
    // search endpoint always answers in its own order.
    return [...(searchQuery.data ?? [])].sort(
      comparePlayersBy(sortField, descendingOrder),
    );
  }, [
    searchActive,
    listQuery.data,
    searchQuery.data,
    sortField,
    descendingOrder,
  ]);

  const useGoalieColumns = showGoalieColumns(
    searchActive,
    players,
    selectedPositions,
  );

  // The route reads resolve to null on failure instead of throwing, so an
  // empty result and a failed request have to be told apart explicitly.
  const hasFailed = !activeQuery.isPending && activeQuery.data === null;

  /*
  Every transition returns the next query state, which is applied to the
  component state and to the URL together — the two cannot drift apart, and the
  rules themselves are tested in `@/lib/player-table-query`.
  */
  const applyQueryState = (next: PlayerQueryState) => {
    setSortField(next.sortField);
    setDescendingOrder(next.descendingOrder);
    setSkip(next.skip);
    setSelectedPositions(next.positions);

    // An absent column is dropped from the URL rather than written as an empty
    // value, which would be read back as a column named "" on the next load.
    if (next.sortField === null) {
      queryParams.delete("sortField");
    } else {
      queryParams.set("sortField", next.sortField);
    }
    queryParams.set("descendingOrder", next.descendingOrder.toString());
    queryParams.set("skip", next.skip.toString());
    queryParams.delete("positions");
    next.positions.forEach((position) =>
      queryParams.append("positions", position),
    );

    router.push(`${pushUrl}/?${queryParams.toString()}`);
  };

  const handleSort = (newSortField: string) =>
    applyQueryState(sortByColumn(queryState, newSortField));

  const handlePageChange = (pageOffset: number) => {
    const next = movePage(queryState, pageOffset, pageSize);
    if (next !== null) {
      applyQueryState(next);
    }
  };

  const handlePositionFilter = (newPositions: string[]) =>
    applyQueryState(filterByPositions(queryState, newPositions));

  const clearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
  };

  const SalaryCell = (player: Player) =>
    player.salary_cap || player.contract_expiration_season ? (
      <PlayerSalary
        playerName={player.name}
        team={player.team}
        salary={player.salary_cap}
        contractExpirationSeason={player.contract_expiration_season}
        currentSeason={currentSeason}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
        }}
      />
    ) : null;

  const skaterColumns: PlayerColumn[] = [
    {
      key: "team",
      label: t("T"),
      sortable: false,
      align: "left",
      render: (player) => (
        <TeamLogo teamId={player.team} width={22} height={22} />
      ),
    },
    {
      key: "position",
      label: "P",
      sortable: false,
      align: "left",
      render: (player) => player.position,
    },
    {
      key: "game_played",
      label: t("GP"),
      sortable: true,
      align: "right",
      render: (player) => player.game_played,
    },
    {
      key: "goals",
      label: t("G"),
      sortable: true,
      align: "right",
      render: (player) => player.goals,
    },
    {
      key: "assists",
      label: "A",
      sortable: true,
      align: "right",
      render: (player) => player.assists,
    },
    {
      key: "points",
      label: "PTS",
      sortable: true,
      align: "right",
      render: (player) => (
        <span className="font-semibold">{player.points}</span>
      ),
    },
    {
      key: "points_per_game",
      label: t("PTS/G"),
      sortable: true,
      align: "right",
      render: (player) => player.points_per_game?.toFixed(3),
    },
    {
      key: "age",
      label: t("Age"),
      sortable: true,
      align: "right",
      render: (player) => player.age,
    },
    {
      key: "salary_cap",
      label: t("Salary"),
      sortable: true,
      align: "right",
      render: SalaryCell,
    },
  ];

  const goalieColumns: PlayerColumn[] = [
    {
      key: "team",
      label: t("T"),
      sortable: false,
      align: "left",
      render: (player) => (
        <TeamLogo teamId={player.team} width={22} height={22} />
      ),
    },
    {
      key: "game_played",
      label: t("GP"),
      sortable: true,
      align: "right",
      render: (player) => player.game_played,
    },
    {
      key: "wins",
      label: t("W"),
      sortable: true,
      align: "right",
      render: (player) => <span className="font-semibold">{player.wins}</span>,
    },
    {
      key: "ot",
      label: t("OTL"),
      sortable: true,
      align: "right",
      render: (player) => player.ot,
    },
    {
      key: "save_percentage",
      label: t("s%"),
      sortable: true,
      align: "right",
      render: (player) => player.save_percentage?.toFixed(3),
    },
    {
      key: "goal_against_average",
      label: "GAA",
      sortable: true,
      align: "right",
      render: (player) => player.goal_against_average?.toFixed(2),
    },
    {
      key: "age",
      label: t("Age"),
      sortable: true,
      align: "right",
      render: (player) => player.age,
    },
    {
      key: "salary_cap",
      label: t("Salary"),
      sortable: true,
      align: "right",
      render: SalaryCell,
    },
  ];

  const columns = useGoalieColumns ? goalieColumns : skaterColumns;

  // A player is unavailable once a pooler holds them, either by protecting them
  // for next season or by drafting them. Protection wins over ownership: on the
  // dynasty tab that is the only thing the table is about.
  const getOwnership = (player: Player) => {
    const protectedBy = protectedPlayers?.[player.id];
    const owner =
      protectedBy ??
      (considerOnlyProtected ? undefined : playersOwner?.[player.id]);

    return owner ? { owner, isProtected: protectedBy !== undefined } : null;
  };

  const PlayerNameCell = (
    player: Player,
    ownership: ReturnType<typeof getOwnership>,
  ) => {
    return (
      // The owner sits under the name rather than beside it: as a badge on the
      // same line it was both loud and, being wider than most player names,
      // what actually decided how wide this column got.
      <div className="flex min-w-0 flex-col justify-center leading-tight">
        <PlayerLink
          name={player.name}
          id={player.id}
          textStyle={null}
          onLinkClick={(e: React.MouseEvent) => {
            e.stopPropagation();
          }}
        />
        {ownership ? (
          <span className="truncate text-[10px] font-medium leading-tight text-muted-foreground">
            {ownership.isProtected
              ? t("ProtectedBy", { poolerName: ownership.owner })
              : t("TakenBy", { poolerName: ownership.owner })}
          </span>
        ) : null}
      </div>
    );
  };

  const PlayersDataTable = () => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(RANK_CELL, STAT_CELL, "bg-background")}>
            #
          </TableHead>
          <TableHead className={cn(NAME_CELL, "bg-background px-1 sm:px-2")}>
            {t("Player")}
          </TableHead>
          {columns.map((column) =>
            column.sortable ? (
              <SortHeaderCell
                key={column.key}
                label={column.label}
                sortKey={column.key}
                currentSortKey={sortField}
                sortDirection={descendingOrder ? "desc" : "asc"}
                onSort={() => handleSort(column.key)}
                align={column.align}
                className={cn(STAT_CELL, "px-0 sm:px-0")}
              />
            ) : (
              <TableHead
                key={column.key}
                className={cn(
                  STAT_CELL,
                  "whitespace-nowrap",
                  column.align === "right" && "text-right",
                )}
              >
                {column.label}
              </TableHead>
            ),
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player, i) => {
          const ownership = getOwnership(player);
          const stickyBg = ownership ? TAKEN_STICKY_BG : STICKY_BG;

          return (
            <TableRow
              key={player.id}
              className={cn(
                "group",
                onPlayerSelect && "cursor-pointer",
                ownership && TAKEN_ROW,
              )}
              tabIndex={onPlayerSelect ? 0 : undefined}
              onClick={() => onPlayerSelect?.(player)}
              onKeyDown={(e) => {
                if (onPlayerSelect && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onPlayerSelect(player);
                }
              }}
            >
              <TableCell
                className={cn(
                  RANK_CELL,
                  stickyBg,
                  STAT_CELL,
                  "py-1.5 tabular-nums text-muted-foreground",
                  ownership && TAKEN_MARKER,
                )}
              >
                {(searchActive ? 0 : skip) + i + 1}
              </TableCell>
              {/* The name keeps the default text size: it is what the row is
                  about, and the stats shrinking around it gives the hierarchy. */}
              <TableCell
                className={cn(NAME_CELL, stickyBg, "px-1 py-1.5 sm:px-2")}
              >
                {PlayerNameCell(player, ownership)}
              </TableCell>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn(
                    STAT_CELL,
                    "whitespace-nowrap py-1.5 tabular-nums",
                    column.align === "right" && "text-right",
                  )}
                >
                  {column.render(player)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const PlayerPositionFilter = () => (
    <Combobox
      selections={[
        { value: "F, D", label: t("Skaters") },
        { value: "G", label: t("Goalies") },
        { value: "F", label: t("ForwardsOnly") },
        { value: "D", label: t("DefendersOnly") },
      ]}
      defaultSelectedValue={selectedPositions.join(", ")}
      emptyText={t("Position")}
      onSelect={(newValue) =>
        handlePositionFilter(
          newValue.split(",").map((s) => s.trim().toUpperCase()),
        )
      }
    />
  );

  const PlayersToolbar = () => (
    <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        {activeQuery.isFetching && searchActive ? (
          <LoaderCircle className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && searchInput) {
              e.stopPropagation(); // Clear the search rather than close the dialog.
              clearSearch();
            }
          }}
          placeholder={t("SearchAPlayer")}
          aria-label={t("PlayerSearch")}
          className="px-8 [&::-webkit-search-cancel-button]:hidden"
        />
        {searchInput ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("ClearSearch")}
            onClick={clearSearch}
            className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
      {/* The filter is not applied to a name search, so it would only be
          misleading while one is running. */}
      {searchActive ? null : PlayerPositionFilter()}
      <p
        aria-live="polite"
        className="text-xs text-muted-foreground sm:ml-auto"
      >
        {searchInput.trim().length > 0 && !searchActive
          ? t("SearchMinimumCharacters", { count: MINIMUM_SEARCH_CHARACTERS })
          : searchActive && !activeQuery.isPending
            ? t("SearchResultCount", { count: players.length })
            : null}
      </p>
    </div>
  );

  const PlayersPagination = () => {
    const page = Math.floor(skip / pageSize) + 1;
    // Nothing in the response tells us the total, but a short page can only be
    // the last one.
    const hasNextPage = players.length === pageSize;

    if (page === 1 && !hasNextPage) return null;

    return (
      <div className="flex items-center justify-center gap-2 p-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(-1)}
          disabled={page === 1 || activeQuery.isFetching}
        >
          <ChevronLeft className="size-4" />
          {t("Previous")}
        </Button>
        <span className="min-w-20 text-center text-sm tabular-nums text-muted-foreground">
          {t("PageNumber", { page })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(1)}
          disabled={!hasNextPage || activeQuery.isFetching}
        >
          {t("Next")}
          <ChevronRight className="size-4" />
        </Button>
      </div>
    );
  };

  const PlayersContent = () => {
    if (activeQuery.isPending) {
      return <TableSkeleton rows={10} showTitle={false} />;
    }

    if (hasFailed) {
      return (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("ErrorTitle")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeQuery.refetch()}
          >
            {t("Retry")}
          </Button>
        </div>
      );
    }

    if (players.length === 0) {
      return (
        <p className="p-8 text-center text-sm text-muted-foreground">
          {searchActive
            ? t("NoPlayersFoundWith", { searchValue: searchTerm })
            : t("NoData")}
        </p>
      );
    }

    return (
      // Fading out while a new page or sort is in flight keeps the previous
      // rows on screen instead of collapsing the table on every click.
      <div
        className={cn(
          "transition-opacity",
          activeQuery.isFetching && "opacity-60",
        )}
      >
        {PlayersDataTable()}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl text-left">
      {PlayersToolbar()}
      {PlayersContent()}
      {!searchActive && !hasFailed ? PlayersPagination() : null}
    </div>
  );
};

export default PlayersTable;
