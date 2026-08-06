// The pools page, list all the pools stored in the db.

"use client";
import { use } from "react";
import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Pool } from "@/data/pool/model";
import { PoolContextProvider, fetchPoolInfo } from "@/context/pool-context";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import PoolStatus from "./pool";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function PoolPage(props: { params: Promise<{ name: string }> }) {
  const [poolInfo, setPoolInfo] = React.useState<Pool | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const t = useTranslations();
  const params = use(props.params);

  const getPoolInfo = React.useCallback(async () => {
    setError(null);
    const poolResponse = await fetchPoolInfo(params.name);

    if (typeof poolResponse === "string") {
      const message = t("CouldNotGetPoolInfoError", {
        pool: params.name,
        error: poolResponse,
      });
      setError(message);
      toast.error(message, { duration: 2000 });
      return;
    }

    setPoolInfo(poolResponse);
  }, [params.name, t]);

  React.useEffect(() => {
    getPoolInfo();
  }, [getPoolInfo]);

  if (poolInfo) {
    return (
      <div className="item-center text-center">
        <PoolContextProvider pool={poolInfo}>
          <PoolStatus />
        </PoolContextProvider>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg">
        <Alert variant="destructive" className="text-left">
          <AlertCircle className="size-4" />
          <AlertTitle>{t("ErrorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={getPoolInfo}>
            {t("Retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="item-center text-center">
      <TableSkeleton />
    </div>
  );
}
