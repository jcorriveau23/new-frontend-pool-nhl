// The pools page, list all the pools stored in the db.

"use client";
import * as React from "react";
import { PoolState } from "@/data/pool/model";
import InProgressPool from "./in-progress/in-progress-pool";
import CreatedPool from "./created/created-pool";
import DynastyPool from "./dynasty/dynasty-pool";
import DraftPool from "./draft/draft-pool";
import { SocketProvider } from "@/context/socket-context";
import { usePoolContext } from "@/context/pool-context";
import { useTranslations } from "next-intl";
import { useSession } from "@/context/useSessionData";

export default function PoolStatus() {
  const { poolInfo } = usePoolContext();
  const t = useTranslations();

  const { jwt } = useSession();

  switch (poolInfo.status) {
    case PoolState.Created:
      return (
        <>
          <h1 className="text-2xl font-bold">
            {t("PoolCreatedPageTitle", { poolName: poolInfo.name })}
          </h1>
          <SocketProvider jwt={jwt}>
            <CreatedPool />
          </SocketProvider>
        </>
      );
    case PoolState.Draft:
      return (
        <>
          <h1 className="text-2xl font-bold">
            {t("PoolDraftPageTitle", { poolName: poolInfo.name })}
          </h1>
          <SocketProvider jwt={jwt}>
            <DraftPool />
          </SocketProvider>
        </>
      );
    case PoolState.InProgress:
    case PoolState.Final:
      return (
        <>
          <h1 className="text-2xl font-bold">
            {poolInfo.status === PoolState.InProgress
              ? t("PoolInProgressPageTitle", { poolName: poolInfo.name })
              : t("PoolFinalPageTitle", { poolName: poolInfo.name })}
          </h1>
          <InProgressPool />
        </>
      );
    case PoolState.Dynasty:
      return (
        <>
          <h1 className="text-2xl font-bold">{t("PoolDynastyPageTitle")}</h1>
          <DynastyPool />
        </>
      );
  }
}
