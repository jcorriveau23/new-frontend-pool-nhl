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
import PageTitle from "@/components/page-title";
import { useSession } from "@/context/useSessionData";

export default function PoolStatus() {
  const { poolInfo } = usePoolContext();
  const t = useTranslations();

  const { jwt } = useSession();

  switch (poolInfo.status) {
    case PoolState.Created:
      return (
        <>
          <PageTitle title={t("PoolCreatedPageTitle")} />
          <SocketProvider jwt={jwt}>
            <CreatedPool />
          </SocketProvider>
        </>
      );
    case PoolState.Draft:
      return (
        <>
          <PageTitle title={t("PoolDraftPageTitle")} />
          <SocketProvider jwt={jwt}>
            <DraftPool />
          </SocketProvider>
        </>
      );
    case PoolState.InProgress:
    case PoolState.Final:
      return (
        <>
          <PageTitle title={t("PoolInProgressPageTitle")} />
          <InProgressPool />
        </>
      );
    case PoolState.Dynasty:
      return (
        <>
          <PageTitle title={t("PoolDynastyPageTitle")} />
          <DynastyPool />
        </>
      );
  }
}
