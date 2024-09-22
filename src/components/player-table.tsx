import React, { useEffect, useState } from "react";
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
  PaginationFirst,
} from "@/components/ui/pagination";
import { TeamLogo } from "./team-logo";
import { usePoolContext } from "@/context/pool-context";
import { useTranslations } from "next-intl";
import { Combobox } from "./ui/combobox";
import { Badge } from "./ui/badge";
import PlayerSalary from "./player-salary";
import PlayerSearchDialog from "./search-players";
import SortHeaderCell from "./sort-header-cell";

interface PlayersTableProps {
  sortField: string | null;
  skip: number | null;
  limit: number | null;
  considerOnlyProtected: boolean;
  onPlayerSelect: ((player: Player) => Promise<boolean>) | null;
}

const PlayersTable: React.FC<PlayersTableProps> = ({
  sortField: initialSortField,
  skip: initialSkip,
  limit: initialLimit,
  considerOnlyProtected,
  onPlayerSelect,
}) => {
  const [sortField, setSortField] = useState<string | null>(initialSortField);
  const [descendingOrder, setDescendingOrder] = useState<boolean | null>(true);
  const [skip, setSkip] = useState<number | null>(initialSkip);
  const [limit, setLimit] = useState<number | null>(initialLimit);
  const [selectedPositions, setSelectedPositions] = useState<string[] | null>([
    "F",
    "D",
  ]);
  const [players, setPlayers] = React.useState<Player[] | null>(null);
  const { poolInfo, dictUsers, playersOwner } = usePoolContext();
  const t = useTranslations();

  const getServerActionPlayers = async () => {
    const players = await getServerSidePlayers(
      selectedPositions,
      sortField,
      descendingOrder,
      skip,
      limit
    );

    setPlayers(players);
  };

  useEffect(() => {
    setPlayers(null);
    getServerActionPlayers();
  }, []);

  // Toggle sorting order on column header click
  const handleSort = async (newSortfield: string) => {
    setSkip(0);
    const newDescendingOrder =
      newSortfield === sortField ? !descendingOrder : true;

    const players = await getServerSidePlayers(
      selectedPositions,
      newSortfield,
      newDescendingOrder,
      0,
      limit
    );

    setPlayers(players);
    setSortField(newSortfield);
    setDescendingOrder(newDescendingOrder);
  };

  const handleNextPage = async (pageOffset: number) => {
    const newSkip = (skip ?? 0) + pageOffset * (limit ?? 50);

    if (newSkip < 0) return;

    const players = await getServerSidePlayers(
      selectedPositions,
      sortField,
      descendingOrder,
      newSkip,
      limit
    );

    setPlayers(players);
    setSkip(newSkip);
  };

  const handleFirstPage = async () => {
    const newSkip = 0;

    const players = await getServerSidePlayers(
      selectedPositions,
      sortField,
      descendingOrder,
      newSkip,
      limit
    );

    setPlayers(players);
    setSkip(newSkip);
  };

  const handlePositionFilter = async (newPositions: string[]) => {
    const isGoalies = newPositions.includes("G");
    const wasGoalies = selectedPositions?.includes("G");

    // If position changed from skater <-> goalies we need to setup the default sorting.
    const newSortField = isGoalies
      ? "salary_cap"
      : wasGoalies
      ? "points"
      : sortField;

    const players = await getServerSidePlayers(
      newPositions,
      newSortField,
      descendingOrder,
      skip,
      limit
    );

    setPlayers(players);
    setSortField(newSortField);
    setSelectedPositions(newPositions);
  };

  if (players === null) {
    return (
      <div>
        <h1>Could not fetch players.</h1>
      </div>
    );
  }

  const findUsersProtectingPlayers = (playerId: number): string | null => {
    for (const [userId, protectedPlayers] of Object.entries(
      poolInfo.context?.protected_players ?? {}
    )) {
      if (protectedPlayers.includes(playerId)) {
        return userId; // Return the first user who owns the player
      }
    }
    return null; // Return null if no user owns the player
  };

  const PlayerLinkWithInfo = (player: Player) => {
    const userProtected = findUsersProtectingPlayers(player.id);
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

        {userProtected ? (
          <Badge variant="secondary">{dictUsers[userProtected].name}</Badge>
        ) : !considerOnlyProtected && playersOwner[player.id] ? (
          <Badge variant="secondary">
            {dictUsers[playersOwner[player.id]].name}
          </Badge>
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
          {players.map((player, i) => (
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
              label={t("s%")}
              sortKey="save_percentage"
              currentSortKey={sortField}
              sortDirection={descendingOrder ? "desc" : "asc"}
              onSort={() => handleSort("save_percentage")}
            ></SortHeaderCell>
            <SortHeaderCell
              label={t("GAA")}
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
          {players.map((player, i) => (
            <TableRow onClick={() => onPlayerSelect?.(player)} key={player.id}>
              <TableCell>{(skip ?? 0) + i + 1}</TableCell>
              <TableCell>{PlayerLinkWithInfo(player)}</TableCell>
              <TableCell>
                <TeamLogo teamId={player.team} width={30} height={30} />
              </TableCell>
              <TableCell>{player.game_played}</TableCell>
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
          defaultSelectedValue="F, D"
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
    const pageOffset = skip ? skip / (limit ?? 50) : 0;
    return (
      <Pagination>
        <PaginationContent>
          {pageOffset > 0 ? (
            <PaginationItem>
              <PaginationFirst onClick={() => handleFirstPage()} />
            </PaginationItem>
          ) : null}
          <PaginationItem>
            {pageOffset > 0 ? (
              <PaginationLink onClick={() => handleNextPage(-1)}>
                {pageOffset}
              </PaginationLink>
            ) : null}
            <PaginationLink isActive>{1 + pageOffset}</PaginationLink>
            <PaginationLink onClick={() => handleNextPage(1)}>
              {2 + pageOffset}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext onClick={() => handleNextPage(1)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div>
      <div className="p-2">
        <PlayerSearchDialog
          label={t("PlayerSearch")}
          onPlayerSelect={onPlayerSelect}
        />
        {PlayerPositionFilter()}
        {selectedPositions?.includes("G") ? GoaliesTable() : SkatersTable()}
      </div>
      {PlayersTablePagination()}
    </div>
  );
};

export default PlayersTable;
