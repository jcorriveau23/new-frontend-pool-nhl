"use client";
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { getServerSidePlayers } from "@/actions/players";
import { Player } from "@/data/pool/model";
import PlayerLink from "./player-link";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { TeamLogo } from "./team-logo";
import { useTranslations } from "next-intl";
import { Combobox } from "./ui/combobox";
import { Badge } from "./ui/badge";
import PlayerSalary from "./player-salary";
import PlayerSearchDialog from "./search-players";
import SortHeaderCell from "./sort-header-cell";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";

interface PlayersTableProps {
  sortField: string | null;
  skip: number | null;
  limit: number | null;
  considerOnlyProtected: boolean;
  pushUrl: string; // /players/... || /pool/{name}/...
  playersOwner: Record<string, string> | null; // maps player id to pooler name
  protectedPlayers: Record<string, string> | null; // maps player id to pooler name
  onPlayerSelect: ((player: Player) => Promise<boolean>) | null;
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
}) => {
  const searchParams = useSearchParams();
  const queryParams = new URLSearchParams(searchParams.toString());
  const positionsParams = queryParams.getAll("positions");

  const [sortField, setSortField] = useState<string | null>(
    queryParams.get("sortField") ?? initialSortField
  );
  const [descendingOrder, setDescendingOrder] = useState<boolean | null>(
    (queryParams.get("descendingOrder") ?? "true") === "true"
  );
  const [skip, setSkip] = useState<number | null>(
    Number(queryParams.get("skip") ?? initialSkip)
  );
  const [limit] = useState<number | null>(initialLimit);
  const [selectedPositions, setSelectedPositions] = useState<string[] | null>(
    positionsParams.length ? positionsParams : ["F", "D"]
  );
  const router = useRouter();
  const t = useTranslations();

  const query = useQuery({
    queryKey: [
      "players",
      selectedPositions,
      sortField,
      descendingOrder,
      skip,
      limit,
    ],
    queryFn: () => {
      return getServerSidePlayers(
        selectedPositions,
        sortField,
        descendingOrder,
        skip,
        limit
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Toggle sorting order on column header click
  const handleSort = async (newSortField: string) => {
    setSkip(0);
    queryParams.set("skip", "0");

    const newDescendingOrder =
      newSortField === sortField ? !descendingOrder : true;

    setSortField(newSortField);
    queryParams.set("sortField", newSortField);
    setDescendingOrder(newDescendingOrder);
    queryParams.set("descendingOrder", newDescendingOrder.toString());

    router.push(`${pushUrl}/?${queryParams.toString()}`);
  };

  const handleNextPage = async (pageOffset: number) => {
    const newSkip = (skip ?? 0) + pageOffset * (limit ?? 100);

    if (newSkip < 0) return;
    setSkip(newSkip);
    queryParams.set("skip", newSkip.toString());

    router.push(`${pushUrl}/?${queryParams.toString()}`);
  };

  const handleFirstPage = async () => {
    const newSkip = 0;
    setSkip(newSkip);
    queryParams.set("skip", newSkip.toString());

    router.push(`${pushUrl}/?${queryParams.toString()}`);
  };

  const handlePositionFilter = async (newPositions: string[]) => {
    const isGoalies = newPositions.includes("G");
    const wasGoalies = selectedPositions?.includes("G");

    // If position changed from skater <-> goalies we need to setup the default sorting.
    const newSortField = isGoalies
      ? "salary_cap"
      : wasGoalies
      ? "points"
      : sortField ?? "points";

    setSortField(newSortField);
    queryParams.set("sortField", newSortField);

    setSelectedPositions(newPositions);
    queryParams.delete("positions");
    newPositions.forEach((p) => {
      queryParams.append("positions", p);
    });

    router.push(`${pushUrl}/?${queryParams.toString()}`);
  };

  if (query === null) {
    return (
      <div>
        <h1>Could not fetch players.</h1>
      </div>
    );
  }

  const PlayerLinkWithInfo = (player: Player) => {
    return (
      <div className="flex items-center space-x-2">
        <div>
          <PlayerLink
            name={player.name}
            id={player.id}
            textStyle={null}
            onLinkClick={(e: React.MouseEvent) => {
              e.stopPropagation();
            }}
          />
        </div>

        {protectedPlayers?.[player.id] ? (
          <Badge variant="secondary">{protectedPlayers[player.id]}</Badge>
        ) : !considerOnlyProtected && playersOwner?.[player.id] ? (
          <Badge variant="secondary">{playersOwner[player.id]}</Badge>
        ) : null}
      </div>
    );
  };

  const SkatersTable = () => (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>{t("Player")}</TableHead>
            <TableHead>{t("T")}</TableHead>
            <TableHead>P</TableHead>
            <SortHeaderCell
              label={t("GP")}
              sortKey="game_played"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("game_played")}
            ></SortHeaderCell>
            <SortHeaderCell
              label={t("G")}
              sortKey="goals"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("goals")}
            ></SortHeaderCell>
            <SortHeaderCell
              label="A"
              sortKey="assists"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("assists")}
            ></SortHeaderCell>
            <SortHeaderCell
              label="PTS"
              sortKey="points"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("points")}
            ></SortHeaderCell>
            <SortHeaderCell
              label={t("PTS/G")}
              sortKey="points_per_game"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("points_per_game")}
            ></SortHeaderCell>
            <SortHeaderCell
              label={t("Age")}
              sortKey="age"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("age")}
            ></SortHeaderCell>
            <SortHeaderCell
              label={t("Salary")}
              sortKey="salary_cap"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("salary_cap")}
            ></SortHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.data?.map((player, i) => (
            <TableRow onClick={() => onPlayerSelect?.(player)} key={player.id}>
              <TableCell>{(skip ?? 0) + i + 1}</TableCell>
              <TableCell>{PlayerLinkWithInfo(player)}</TableCell>
              <TableCell>
                <TeamLogo teamId={player.team} width={30} height={30} />
              </TableCell>
              <TableCell>{player.position}</TableCell>
              <TableCell>{player.game_played}</TableCell>
              <TableCell>{player.goals}</TableCell>
              <TableCell>{player.assists}</TableCell>
              <TableCell>{player.points}</TableCell>
              <TableCell>{player.points_per_game?.toFixed(3)}</TableCell>
              <TableCell>{player.age}</TableCell>
              <TableCell>
                {player.salary_cap && player.contract_expiration_season ? (
                  <PlayerSalary
                    playerName={player.name}
                    team={player.team}
                    salary={player.salary_cap}
                    contractExpirationSeason={player.contract_expiration_season}
                    onBadgeClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                    }}
                  />
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );

  const GoaliesTable = () => (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead onClick={() => handleSort("name")}>
              {t("Player")}
            </TableHead>
            <TableHead onClick={() => handleSort("team")}>{t("T")}</TableHead>
            <SortHeaderCell
              label={t("GP")}
              sortKey="game_played"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("game_played")}
            ></SortHeaderCell>
            <SortHeaderCell
              label={t("wins")}
              sortKey="wins"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("wins")}
            ></SortHeaderCell>
            <SortHeaderCell
              label={t("ot")}
              sortKey="ot"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("ot")}
            ></SortHeaderCell>
            <SortHeaderCell
              label={t("s%")}
              sortKey="save_percentage"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("save_percentage")}
            ></SortHeaderCell>
            <SortHeaderCell
              label="GAA"
              sortKey="goal_against_average"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("goal_against_average")}
            ></SortHeaderCell>
            <SortHeaderCell
              label={t("Age")}
              sortKey="age"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("age")}
            ></SortHeaderCell>
            <SortHeaderCell
              label={t("Salary")}
              sortKey="salary_cap"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("salary_cap")}
            ></SortHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.data?.map((player, i) => (
            <TableRow onClick={() => onPlayerSelect?.(player)} key={player.id}>
              <TableCell>{(skip ?? 0) + i + 1}</TableCell>
              <TableCell>{PlayerLinkWithInfo(player)}</TableCell>
              <TableCell>
                <TeamLogo teamId={player.team} width={30} height={30} />
              </TableCell>
              <TableCell>{player.game_played}</TableCell>
              <TableCell>{player.wins}</TableCell>
              <TableCell>{player.ot}</TableCell>
              <TableCell>{player.save_percentage?.toFixed(3)}</TableCell>
              <TableCell>{player.goal_against_average?.toFixed(2)}</TableCell>
              <TableCell>{player.age}</TableCell>
              <TableCell>
                {player.salary_cap && player.contract_expiration_season ? (
                  <PlayerSalary
                    playerName={player.name}
                    team={player.team}
                    salary={player.salary_cap}
                    contractExpirationSeason={player.contract_expiration_season}
                    onBadgeClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                    }}
                  />
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );

  // ["Skaters", "Goalies", "Forwards only", ""]
  const PlayerPositionFilter = () => (
    <div className="flex items-center space-x-2">
      <div>{t("Position")}</div>
      <div>
        <Combobox
          selections={[
            {
              value: "F, D",
              label: t("Skaters"),
            },
            {
              value: "G",
              label: t("Goalies"),
            },
            {
              value: "F",
              label: t("ForwardsOnly"),
            },
            {
              value: "D",
              label: t("DefendersOnly"),
            },
          ]}
          defaultSelectedValue={selectedPositions?.join(", ") ?? "F, D"}
          emptyText=""
          onSelect={(newValue) =>
            handlePositionFilter(
              newValue.split(",").map((s) => s.trim().toUpperCase())
            )
          }
        />
      </div>
    </div>
  );

  const PlayersTablePagination = () => {
    const pageOffset = skip ? skip / (limit ?? 100) : 0;
    return (
      <Pagination>
        <PaginationContent>
          {pageOffset > 0 ? (
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handleFirstPage()}
                size={undefined}
              />
            </PaginationItem>
          ) : null}
          <PaginationItem>
            {pageOffset > 0 ? (
              <PaginationLink
                onClick={() => handleNextPage(-1)}
                size={undefined}
              >
                {pageOffset}
              </PaginationLink>
            ) : null}
            <PaginationLink isActive size={undefined}>
              {1 + pageOffset}
            </PaginationLink>
            <PaginationLink onClick={() => handleNextPage(1)} size={undefined}>
              {2 + pageOffset}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              onClick={() => handleNextPage(1)}
              size={undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div>
      <div className="p-2 space-y-2">
        <PlayerSearchDialog
          label={t("PlayerSearch")}
          onPlayerSelect={onPlayerSelect}
        />
        {PlayerPositionFilter()}
      </div>
      {selectedPositions?.includes("G") ? GoaliesTable() : SkatersTable()}
      {PlayersTablePagination()}
    </div>
  );
};

export default PlayersTable;
