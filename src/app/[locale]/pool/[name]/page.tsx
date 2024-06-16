// The pools page, list all the pools stored in the db.

"use client";
import * as React from "react";
import { Pool, PoolState } from "@/data/pool/model";
import InProgressPool from "./in-progress/in-progress-pool";
import CreatedPool from "./created/created-pool";
import { PoolContextProvider, fetchPoolInfo } from "@/context/pool-context";
import { useTranslations } from "next-intl";
import DynastyPool from "./dynasty/dynasty-pool";
import DraftPool from "./draft/draft-pool";

export default function PoolPage({ params }: { params: { name: string } }) {
  const [poolInfo, setPoolInfo] = React.useState<Pool | null>(null);
  const t = useTranslations();

  React.useEffect(() => {
    const getPoolInfo = async () => {
      const poolResponse = await fetchPoolInfo(params.name);

      if (typeof poolResponse === "string") {
        alert(
          t("CouldNotGetPoolInfoError", {
            pool: params.name,
            error: poolResponse,
          })
        );
        return;
      }

      setPoolInfo(poolResponse);
    };
    getPoolInfo();
  }, [params.name]);

  const getPoolContent = (poolInfo: Pool) => {
    switch (poolInfo.status) {
      case PoolState.Created:
        return <CreatedPool />;
      case PoolState.Draft:
        return <DraftPool />;
      case PoolState.InProgress:
      case PoolState.Final:
        return <InProgressPool />;
      case PoolState.Dynasty:
        return <DynastyPool />;
    }
  };

  if (poolInfo === null) {
    return <h1>Loading...</h1>;
  }

  return (
    <PoolContextProvider pool={poolInfo}>
      {getPoolContent(poolInfo)}
    </PoolContextProvider>
  );
}
