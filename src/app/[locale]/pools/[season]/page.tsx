// The pools page, list all the pools stored in the db.

import * as React from "react";
import { ProjectedPoolShort } from "@/data/pool/model";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { getAllYears } from "@/lib/nhl";
import { seasonFormat, seasonWithYearFormat } from "@/app/utils/formating";
import { Combobox } from "@/components/ui/link-combobox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import PageTitle from "@/components/page-title";
import { backendUrl, fetchJson } from "@/lib/server-api";
import PoolList from "./pool-list";

const FIRST_POOL_SEASON = 2021;
const CURRENT_POOL_SEASON = 2025;

const getServersidePoolList = async (season: string) =>
  /*
    Query the list of pools for a season on the server side.
    */
  fetchJson<ProjectedPoolShort[]>(backendUrl(`/pools/${season}`), {
    cache: "no-store",
  });

export default async function Pools(props: {
  params: Promise<{ season: string }>;
  searchParams: Promise<string[][] | Record<string, string> | string>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const pools = await getServersidePoolList(params.season);

  const queryString = new URLSearchParams(searchParams).toString();
  const t = await getTranslations();

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
      <div className="flex flex-col items-center text-center gap-2">
        {YearCombo()}
        <h1>
          {t("NoPoolFound", { season: seasonFormat(Number(params.season), 0) })}
        </h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center gap-4">
      <PageTitle title={t("PoolListPageTitle")} />
      {YearCombo()}
      <PoolList pools={pools} queryString={queryString} />
      <Button
        size="lg"
        nativeButton={false}
        render={<Link href={`/create-pool?${queryString}`} />}
      >
        {t("CreatePool")}
        <ArrowRight />
      </Button>
    </div>
  );
}
