// The pools page, list all the pools stored in the db.

"use client";
import * as React from "react";
import { Pool } from "@/data/pool/model";
import { PoolContextProvider, fetchPoolInfo } from "@/context/pool-context";
import { useTranslations } from "next-intl";
import { toast } from "@/hooks/use-toast";
import PoolStatus from "./pool";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function PoolPage({ params }: { params: { name: string } }) {
  const [poolInfo, setPoolInfo] = React.useState<Pool | null>(null);
  const t = useTranslations();

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

  return (
    <div className="item-center text-center">
      {poolInfo ? (
        <PoolContextProvider pool={poolInfo}>
          <PoolStatus />
        </PoolContextProvider>
      ) : (
        <LoadingSpinner />
      )}
    </div>
  );
}
