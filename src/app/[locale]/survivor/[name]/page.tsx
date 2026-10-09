"use client";

import { use } from "react";
import * as React from "react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { SurvivorPool } from "@/data/survivor/model";
import { fetchSurvivorPool } from "@/lib/survivor-api";
import SurvivorPoolPage from "./survivor-pool";

export default function Page(props: { params: Promise<{ name: string }> }) {
  const params = use(props.params);
  const t = useTranslations();
  const [pool, setPool] = React.useState<SurvivorPool | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    const res = await fetchSurvivorPool(params.name);

    if (!res.ok) {
      const message = t("CouldNotGetPoolInfoError", {
        pool: params.name,
        error: res.error,
      });
      setError(message);
      toast.error(message, { duration: 2000 });
      return;
    }

    setPool(res.data);
  }, [params.name, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (pool) {
    return <SurvivorPoolPage pool={pool} />;
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
          <Button variant="outline" onClick={load}>
            {t("Retry")}
          </Button>
        </div>
      </div>
    );
  }

  return <TableSkeleton />;
}
