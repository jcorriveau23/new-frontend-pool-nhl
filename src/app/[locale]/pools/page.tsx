// The pools page, list all the pools stored in the db.

import * as React from "react";
import { PoolState, ProjectedPoolShort } from "@/data/pool/model";
import { Link } from "@/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTranslations } from "next-intl/server";

const getServersidePoolList = async () => {
  /* 
    Query game boxscore for a specific game id on the server side. 
    */
  const res = await fetch(`http://localhost/api-rust/pools`);
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data;
};

export default async function Pools() {
  const pools: ProjectedPoolShort[] = await getServersidePoolList();
  const t = await getTranslations();

  const PoolItem = (poolInfo: ProjectedPoolShort) => (
    <Link href={`/pools/${poolInfo.name}`}>
      <div className="m-2 p-2 border-2 rounded-sm hover:border-primary hover:cursor-pointer bg-muted ">
        <div>
          <p className="text-sm font-medium leading-none">{poolInfo.name}</p>
          <p className="text-sm text-muted-foreground">{poolInfo.owner}</p>
        </div>
      </div>
    </Link>
  );

  const PoolTabTrigger = (poolStatus: PoolState) => (
    <TabsTrigger value={poolStatus}>{`${t(poolStatus)} (${
      pools.filter((pool) => pool.status === poolStatus).length
    })`}</TabsTrigger>
  );

  const PoolTabContent = (poolStatus: PoolState) => (
    <TabsContent value={poolStatus}>
      {pools
        .filter((pool) => pool.status === poolStatus)
        .map((pool) => PoolItem(pool))}
    </TabsContent>
  );

  return (
    <Tabs defaultValue={PoolState.InProgress}>
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
  );
}
