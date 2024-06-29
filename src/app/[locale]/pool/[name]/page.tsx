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
import { toast } from "@/hooks/use-toast";
import { SocketProvider } from "@/context/socket-context";
import { useSession } from "@/context/useSessionData";

export default function PoolPage({ params }: { params: { name: string } }) {
  const [poolInfo, setPoolInfo] = React.useState<Pool | null>(null);
  const t = useTranslations();
  const { jwt } = useSession();

  React.useEffect(() => {
    const getPoolInfo = async () => {
      const poolResponse = await fetchPoolInfo(params.name);

      if (typeof poolResponse === "string") {
        toast({
          variant: "destructive",
          title: t("CouldNotGetPoolInfoError", {
            pool: params.name,
            error: poolResponse,
          }),
          duration: 2000,
        });
        return;
      }

      setPoolInfo(poolResponse);
    };
    getPoolInfo();
  }, [params.name]);

  const getPoolContent = (poolInfo: Pool) => {
    switch (poolInfo.status) {
      case PoolState.Created:
        return (
          <SocketProvider jwt={jwt}>
            <CreatedPool />
          </SocketProvider>
        );
      case PoolState.Draft:
        return (
          <SocketProvider jwt={jwt}>
            <DraftPool />
          </SocketProvider>
        );
      case PoolState.InProgress:
      case PoolState.Final:
        return <InProgressPool />;
      case PoolState.Dynasty:
        return <DynastyPool />;
    }
  };

  if (poolInfo === null) {
    return <h1>Loading pool info...</h1>;
  }

  return (
    <PoolContextProvider pool={poolInfo}>
      {getPoolContent(poolInfo)}
    </PoolContextProvider>
  );
}
