// The pools page, list all the pools stored in the db.

import * as React from "react";
import { PoolState, ProjectedPoolShort } from "@/data/pool/model";
import { Link } from "@/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTranslations } from "next-intl/server";
import { getAllYears } from "@/lib/nhl";
import { seasonWithYearFormat } from "@/app/utils/formating";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";

const FIRST_POOL_SEASON = 2021;
const CURRENT_POOL_SEASON = 2024;

const getServersidePoolList = async (season: string) => {
  /* 
    Query game boxscore for a specific game id on the server side. 
    */
  const res = await fetch(`http://localhost/api-rust/pools/${season}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data;
};

const getPoolCountPerStatus = (
  pools: ProjectedPoolShort[]
): Record<PoolState, number> => {
  // @ts-ignore
  const poolCountPerStatus: Record<PoolState, number> = {};

  for (const poolStatus of Object.values(PoolState)) {
    poolCountPerStatus[poolStatus] = pools.filter(
      (pool) => pool.status === poolStatus
    ).length;
  }

  return poolCountPerStatus;
};

const getTabIndex = (poolCountPerStatus: Record<PoolState, number>) => {
  for (const poolStatus of Object.values(PoolState)) {
    if (poolCountPerStatus[poolStatus] > 0) {
      return poolStatus;
    }
  }
};

export default async function Pools({
  params,
}: {
  params: { season: string };
}) {
  const pools: ProjectedPoolShort[] = await getServersidePoolList(
    params.season
  );
  const poolCountPerStatus = getPoolCountPerStatus(pools);
  const tabIndex = getTabIndex(poolCountPerStatus);

  const t = await getTranslations();

  const PoolItem = (poolInfo: ProjectedPoolShort) => (
    <Link href={`/pool/${poolInfo.name}`}>
      <div className="m-2 p-2 border-2 rounded-sm hover:border-primary hover:cursor-pointer bg-muted ">
        <div>
          <p className="text-sm font-medium leading-none">{poolInfo.name}</p>
          <p className="text-sm text-muted-foreground">{poolInfo.owner}</p>
        </div>
      </div>
    </Link>
  );

  const PoolTabTrigger = (poolStatus: PoolState) =>
    poolCountPerStatus[poolStatus] > 0 ? (
      <TabsTrigger value={poolStatus}>{`${t(poolStatus)} (${
        poolCountPerStatus[poolStatus]
      })`}</TabsTrigger>
    ) : null;

  const PoolTabContent = (poolStatus: PoolState) =>
    poolCountPerStatus[poolStatus] > 0 ? (
      <TabsContent value={poolStatus}>
        {pools
          .filter((pool) => pool.status === poolStatus)
          .map((pool) => PoolItem(pool))}
      </TabsContent>
    ) : null;

  if (pools === null) {
    return <h1>{t("NoPoolFound", { season: params.season })}</h1>;
  }

  return (
    <div className="items-center text-center space-y-2">
      <div className="space-x-2">
        <Label>{t("Season")}</Label>
        <Combobox
          selections={getAllYears(FIRST_POOL_SEASON, CURRENT_POOL_SEASON).map(
            (season) => ({
              value: `${season}${season + 1}`,
              label: seasonWithYearFormat(season),
            })
          )}
          defaultSelectedValue={params.season}
          emptyText=""
          linkTo={`/pools/\${value}`}
        />
      </div>
      <Tabs defaultValue={tabIndex}>
        <div className="overflow-auto">
          <TabsList>
            {PoolTabTrigger(PoolState.InProgress)}
            {PoolTabTrigger(PoolState.Dynastie)}
            {PoolTabTrigger(PoolState.Created)}
            {PoolTabTrigger(PoolState.Draft)}
            {PoolTabTrigger(PoolState.Final)}
          </TabsList>
        </div>
        {PoolTabContent(PoolState.InProgress)}
        {PoolTabContent(PoolState.Dynastie)}
        {PoolTabContent(PoolState.Created)}
        {PoolTabContent(PoolState.Draft)}
        {PoolTabContent(PoolState.Final)}
      </Tabs>
    </div>
  );
}
