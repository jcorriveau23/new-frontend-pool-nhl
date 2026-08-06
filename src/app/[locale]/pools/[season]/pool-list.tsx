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
}

export default function PoolList({ pools, queryString }: Props) {
  const t = useTranslations();
  const [search, setSearch] = React.useState("");

  // The tab set is derived from every pool so tabs stay stable while searching.
  const totalCountPerStatus = React.useMemo(
    () => countByStatus(pools),
    [pools],
  );
  const visibleStatuses = POOL_STATUS_ORDER.filter(
    (status) => totalCountPerStatus[status] > 0,
  );

  const filteredPools = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return pools;
    }
    return pools.filter(
      (pool) =>
        pool.name.toLowerCase().includes(query) ||
        pool.owner.toLowerCase().includes(query),
    );
  }, [pools, search]);

  const filteredCountPerStatus = React.useMemo(
    () => countByStatus(filteredPools),
    [filteredPools],
  );

  const defaultStatus = visibleStatuses[0];

  const PoolCard = (pool: ProjectedPoolShort) => {
    return (
      <Link href={`/pool/${pool.name}?${queryString}`} key={pool.name}>
        <Card className="flex h-full items-center gap-3 p-4 text-left transition-colors hover:border-primary hover:bg-muted/50">
          <span
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              STATUS_DOT_COLOR[pool.status],
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium leading-tight">{pool.name}</p>
          </div>
          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
            {t(pool.status)}
          </span>
        </Card>
      </Link>
    );
  };

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("SearchPools")}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue={defaultStatus}>
        <div className="overflow-auto">
          <TabsList>
            {visibleStatuses.map((status) => (
              <TabsTrigger key={status} value={status}>
                {`${t(status)} (${filteredCountPerStatus[status]})`}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {visibleStatuses.map((status) => {
          const statusPools = filteredPools.filter(
            (pool) => pool.status === status,
          );

          return (
            <TabsContent key={status} value={status}>
              {statusPools.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {statusPools.map((pool) => PoolCard(pool))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
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
