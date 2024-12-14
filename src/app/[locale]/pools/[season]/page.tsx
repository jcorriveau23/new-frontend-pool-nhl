// The pools page, list all the pools stored in the db.

import * as React from "react";
import { PoolState, ProjectedPoolShort } from "@/data/pool/model";
import { Link } from "@/i18n/routing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTranslations } from "next-intl/server";
import { getAllYears } from "@/lib/nhl";
import { seasonFormat, seasonWithYearFormat } from "@/app/utils/formating";
import { Combobox } from "@/components/ui//link-combobox";
import { Label } from "@/components/ui/label";
import PageTitle from "@/components/page-title";

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
    poolCountPerStatus[poolStatus] =
      pools?.filter((pool) => pool.status === poolStatus).length ?? 0;
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
  searchParams,
}: {
  params: { season: string };
  searchParams: any;
}) {
  const pools: ProjectedPoolShort[] = await getServersidePoolList(
    params.season
  );
  const poolCountPerStatus = getPoolCountPerStatus(pools);
  const tabIndex = getTabIndex(poolCountPerStatus);

  const queryString = new URLSearchParams(searchParams).toString();
  const t = await getTranslations();

  const PoolItem = (poolInfo: ProjectedPoolShort) => (
    <Link href={`/pool/${poolInfo.name}?${queryString}`}>
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

  const YearCombo = () => (
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
  );

  if (pools === null) {
    return (
      <div className="items-center text-center space-y-2">
        {YearCombo()}
        <h1>
          {t("NoPoolFound", { season: seasonFormat(Number(params.season), 0) })}
        </h1>
      </div>
    );
  }

  return (
    <div className="items-center text-center space-y-2">
      <PageTitle title={t("PoolListPageTitle")} />
      {YearCombo()}
      {pools ? (
        <Tabs defaultValue={tabIndex}>
          <div className="overflow-auto">
            <TabsList>
              {PoolTabTrigger(PoolState.InProgress)}
              {PoolTabTrigger(PoolState.Dynasty)}
              {PoolTabTrigger(PoolState.Created)}
              {PoolTabTrigger(PoolState.Draft)}
              {PoolTabTrigger(PoolState.Final)}
            </TabsList>
          </div>
          {PoolTabContent(PoolState.InProgress)}
          {PoolTabContent(PoolState.Dynasty)}
          {PoolTabContent(PoolState.Created)}
          {PoolTabContent(PoolState.Draft)}
          {PoolTabContent(PoolState.Final)}
        </Tabs>
      ) : (
        <div className="items-center text-center space-y-2">
          <h1>
            {t("NoPoolFound", {
              season: seasonFormat(Number(params.season), 0),
            })}
          </h1>
        </div>
      )}
      <Link
        href={`/create-pool?${queryString}`}
        className="text-link hover:underline"
      >
        {t("CreatePool")}
      </Link>
    </div>
  );
}
