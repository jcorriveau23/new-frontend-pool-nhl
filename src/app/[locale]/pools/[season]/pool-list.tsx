"use client";

import * as React from "react";
import { Search, Trash2Icon } from "lucide-react";
import { PoolState, ProjectedPoolShort } from "@/data/pool/model";
import { Link, useRouter } from "@/i18n/routing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import FavoritePoolButton from "@/components/favorite-pool-button";
import DeletePoolDialog from "@/components/delete-pool-dialog";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/useUserData";
import { useFavoritePools } from "@/hooks/use-favorite-pools";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// Order in which the pool statuses are displayed as tabs.
const POOL_STATUS_ORDER: PoolState[] = [
  PoolState.InProgress,
  PoolState.Dynasty,
  PoolState.Created,
  PoolState.Draft,
  PoolState.Final,
];

// First tab, listing every pool whatever its status.
const ALL_TAB = "all";
// Shown before every other tab, and only when the season has favorites.
const FAVORITES_TAB = "favorites";
type TabValue = PoolState | typeof ALL_TAB | typeof FAVORITES_TAB;

// Color of the small status dot shown on each pool card.
const STATUS_DOT_COLOR: Record<PoolState, string> = {
  [PoolState.InProgress]: "bg-emerald-500",
  [PoolState.Dynasty]: "bg-violet-500",
  [PoolState.Created]: "bg-sky-500",
  [PoolState.Draft]: "bg-amber-500",
  [PoolState.Final]: "bg-muted-foreground",
};

const countByStatus = (
  pools: ProjectedPoolShort[],
): Record<PoolState, number> =>
  Object.fromEntries(
    POOL_STATUS_ORDER.map((status) => [
      status,
      pools.filter((pool) => pool.status === status).length,
    ]),
  ) as Record<PoolState, number>;

interface Props {
  pools: ProjectedPoolShort[];
  season: number;
  queryString: string;
  seasonSelector: React.ReactNode;
}

export default function PoolList({
  pools,
  season,
  queryString,
  seasonSelector,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const userData = useUser();
  const { isFavorite } = useFavoritePools();
  const [search, setSearch] = React.useState("");
  const [selectedTab, setSelectedTab] = React.useState<TabValue | null>(null);
  // A deleted pool is dropped right away instead of waiting for the server
  // component to be re-rendered, otherwise its card lingers until the refresh
  // lands.
  const [deletedPools, setDeletedPools] = React.useState<string[]>([]);

  const visiblePools = React.useMemo(
    () => pools.filter((pool) => !deletedPools.includes(pool.name)),
    [pools, deletedPools],
  );

  // The tab set is derived from every pool so tabs stay stable while searching.
  const totalCountPerStatus = React.useMemo(
    () => countByStatus(visiblePools),
    [visiblePools],
  );
  const visibleStatuses = POOL_STATUS_ORDER.filter(
    (status) => totalCountPerStatus[status] > 0,
  );
  const hasFavorites = visiblePools.some((pool) => isFavorite(pool.name));
  // A single status makes the "all" tab a duplicate of it.
  const tabs: TabValue[] = [
    ...(hasFavorites ? ([FAVORITES_TAB] as const) : []),
    ...(visibleStatuses.length > 1 ? ([ALL_TAB] as const) : []),
    ...visibleStatuses,
  ];

  const filteredPools = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = query
      ? visiblePools.filter((pool) => pool.name.toLowerCase().includes(query))
      : visiblePools;

    // Favorites first, then by name so the list does not depend on the order
    // the backend happens to return.
    return [...matching].sort((a, b) => {
      const favoriteDelta =
        Number(isFavorite(b.name)) - Number(isFavorite(a.name));
      return favoriteDelta !== 0 ? favoriteDelta : a.name.localeCompare(b.name);
    });
  }, [visiblePools, search, isFavorite]);

  const filteredCountPerStatus = React.useMemo(
    () => countByStatus(filteredPools),
    [filteredPools],
  );

  const poolsForTab = (tab: TabValue) => {
    switch (tab) {
      case FAVORITES_TAB:
        return filteredPools.filter((pool) => isFavorite(pool.name));
      case ALL_TAB:
        return filteredPools;
      default:
        return filteredPools.filter((pool) => pool.status === tab);
    }
  };

  const tabLabel = (tab: TabValue) => {
    switch (tab) {
      case FAVORITES_TAB:
        return t("Favorites");
      case ALL_TAB:
        return t("All");
      default:
        return t(tab);
    }
  };

  const countForTab = (tab: TabValue) => {
    switch (tab) {
      case FAVORITES_TAB:
        return poolsForTab(FAVORITES_TAB).length;
      case ALL_TAB:
        return filteredPools.length;
      default:
        return filteredCountPerStatus[tab];
    }
  };

  // Searching moves to the first tab that still has results, otherwise typing a
  // name owned by another tab would look like the search found nothing.
  const fallbackTab = tabs.find((tab) => countForTab(tab) > 0) ?? tabs[0];
  const activeTab =
    selectedTab !== null && countForTab(selectedTab) > 0
      ? selectedTab
      : fallbackTab;

  const PoolCard = (pool: ProjectedPoolShort, showStatus: boolean) => {
    return (
      // The link is stretched over the whole card instead of wrapping it, so
      // the favorite button stays a sibling rather than a button inside a link.
      <Card
        key={pool.name}
        className="hover:border-primary hover:bg-muted/50 focus-within:ring-ring relative flex h-full items-center gap-3 p-4 text-left transition-colors focus-within:ring-2 focus-within:ring-offset-2"
      >
        <span
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            STATUS_DOT_COLOR[pool.status],
          )}
          aria-hidden
        />
        <Link
          href={`/pool/${pool.name}?${queryString}`}
          className="min-w-0 flex-1 truncate font-medium leading-tight after:absolute after:inset-0 focus-visible:outline-none"
        >
          {pool.name}
        </Link>
        {showStatus ? (
          <span className="text-muted-foreground shrink-0 whitespace-nowrap text-xs">
            {t(pool.status)}
          </span>
        ) : null}
        <div className="relative -mr-2 flex shrink-0 items-center">
          <FavoritePoolButton poolName={pool.name} season={season} />
          {pool.owner === userData.info?.id ? (
            <DeletePoolDialog
              poolName={pool.name}
              onDeleted={() => {
                setDeletedPools((current) => [...current, pool.name]);
                // Lets the server component drop the pool from the list it
                // rendered, so it does not come back on the next navigation.
                router.refresh();
              }}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive size-8"
                  aria-label={t("DeletePoolLabel", { pool: pool.name })}
                >
                  <Trash2Icon />
                </Button>
              }
            />
          ) : null}
        </div>
      </Card>
    );
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("SearchPools")}
            className="pl-9"
          />
        </div>
        {seasonSelector}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setSelectedTab(value as TabValue)}
      >
        <div className="overflow-auto">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {`${tabLabel(tab)} (${countForTab(tab)})`}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabs.map((tab) => {
          const tabPools = poolsForTab(tab);

          return (
            <TabsContent key={tab} value={tab}>
              {tabPools.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {tabPools.map((pool) =>
                    PoolCard(pool, tab === ALL_TAB || tab === FAVORITES_TAB),
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  {t("NoPoolMatchSearch")}
                </p>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
