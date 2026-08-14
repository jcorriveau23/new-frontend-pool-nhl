"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { PoolState, ProjectedPoolShort } from "@/data/pool/model";
import { Link } from "@/i18n/routing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
type TabValue = PoolState | typeof ALL_TAB;

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
  queryString: string;
  seasonSelector: React.ReactNode;
}

export default function PoolList({
  pools,
  queryString,
  seasonSelector,
}: Props) {
  const t = useTranslations();
  const [search, setSearch] = React.useState("");
  const [selectedTab, setSelectedTab] = React.useState<TabValue | null>(null);

  // The tab set is derived from every pool so tabs stay stable while searching.
  const totalCountPerStatus = React.useMemo(
    () => countByStatus(pools),
    [pools],
  );
  const visibleStatuses = POOL_STATUS_ORDER.filter(
    (status) => totalCountPerStatus[status] > 0,
  );
  // A single status makes the "all" tab a duplicate of it.
  const tabs: TabValue[] =
    visibleStatuses.length > 1
      ? [ALL_TAB, ...visibleStatuses]
      : visibleStatuses;

  const filteredPools = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = query
      ? pools.filter((pool) => pool.name.toLowerCase().includes(query))
      : pools;

    // Sorted by name so the list does not depend on the order the backend
    // happens to return.
    return [...matching].sort((a, b) => a.name.localeCompare(b.name));
  }, [pools, search]);

  const filteredCountPerStatus = React.useMemo(
    () => countByStatus(filteredPools),
    [filteredPools],
  );

  const countForTab = (tab: TabValue) =>
    tab === ALL_TAB ? filteredPools.length : filteredCountPerStatus[tab];
  const poolsForTab = (tab: TabValue) =>
    tab === ALL_TAB
      ? filteredPools
      : filteredPools.filter((pool) => pool.status === tab);

  // Searching moves to the first tab that still has results, otherwise typing a
  // name owned by another tab would look like the search found nothing.
  const fallbackTab = tabs.find((tab) => countForTab(tab) > 0) ?? tabs[0];
  const activeTab =
    selectedTab !== null && countForTab(selectedTab) > 0
      ? selectedTab
      : fallbackTab;

  const PoolCard = (pool: ProjectedPoolShort, showStatus: boolean) => {
    return (
      <Link
        href={`/pool/${pool.name}?${queryString}`}
        key={pool.name}
        className="focus-visible:ring-ring rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <Card className="hover:border-primary hover:bg-muted/50 flex h-full items-center gap-3 p-4 text-left transition-colors">
          <span
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              STATUS_DOT_COLOR[pool.status],
            )}
            aria-hidden
          />
          <p className="min-w-0 flex-1 truncate font-medium leading-tight">
            {pool.name}
          </p>
          {showStatus ? (
            <span className="text-muted-foreground shrink-0 whitespace-nowrap text-xs">
              {t(pool.status)}
            </span>
          ) : null}
        </Card>
      </Link>
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
                {`${tab === ALL_TAB ? t("All") : t(tab)} (${countForTab(tab)})`}
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
                  {tabPools.map((pool) => PoolCard(pool, tab === ALL_TAB))}
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
