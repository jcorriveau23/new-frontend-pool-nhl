// The pools page, list all the pools stored in the db.

import * as React from "react";
import { ProjectedPoolShort } from "@/data/pool/model";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { getAllYears } from "@/lib/nhl";
import { getSeasonInfo, lastSeasonYear } from "@/lib/season-info";
import { seasonFormat, seasonWithYearFormat } from "@/app/utils/formating";
import { Combobox } from "@/components/ui/link-combobox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy } from "lucide-react";
import PageTitle from "@/components/page-title";
import { backendUrl, fetchJson } from "@/lib/server-api";
import { SurvivorPoolShort } from "@/data/survivor/model";
import PoolList from "./pool-list";
import SurvivorPoolList from "./survivor-pool-list";

const FIRST_POOL_SEASON = 2021;

const getServersidePoolList = async (season: string) =>
  /*
    Query the list of pools for a season on the server side.
    */
  fetchJson<ProjectedPoolShort[]>(backendUrl(`/pools/${season}`), {
    cache: "no-store",
  });

// Survivor pools are their own collection, so they are their own request. A
// null (the backend down, or no survivor pool yet) renders nothing rather than
// taking the roster pools down with it.
const getServersideSurvivorPoolList = async (season: string) =>
  fetchJson<SurvivorPoolShort[]>(backendUrl(`/survivor-pools/${season}`), {
    cache: "no-store",
  });

export default async function Pools(props: {
  params: Promise<{ season: string }>;
  searchParams: Promise<string[][] | Record<string, string> | string>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  // Two independent collections, so the two requests go out together rather
  // than one waiting on the other.
  const [pools, survivorPools] = await Promise.all([
    getServersidePoolList(params.season),
    getServersideSurvivorPoolList(params.season),
  ]);

  const queryString = new URLSearchParams(searchParams).toString();
  const t = await getTranslations();
  const lastSeason = lastSeasonYear(await getSeasonInfo());

  // A failed request and an empty season both land on the same empty state,
  // the page has nothing else to show in either case.
  const hasPools = pools !== null && pools.length > 0;
  const hasSurvivorPools = survivorPools !== null && survivorPools.length > 0;

  const seasonSelector = (
    <div className="flex items-center gap-2">
      <Label className="text-muted-foreground">{t("Season")}</Label>
      <Combobox
        selections={getAllYears(FIRST_POOL_SEASON, lastSeason).map(
          (season) => ({
            value: `${season}${season + 1}`,
            label: seasonWithYearFormat(season),
          }),
        )}
        defaultSelectedValue={params.season}
        emptyText=""
        linkTo={`/pools/\${value}`}
      />
    </div>
  );

  const createPoolButton = (
    <Button
      size="lg"
      nativeButton={false}
      render={<Link href={`/create-pool?${queryString}`} />}
    >
      {t("CreatePool")}
      <ArrowRight />
    </Button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle
          title={t("PoolListPageTitle")}
          subtitle={
            hasPools ? t("PoolCount", { count: pools.length }) : undefined
          }
        />
        {hasPools ? createPoolButton : null}
      </div>

      {hasPools ? (
        <PoolList
          pools={pools}
          season={Number(params.season)}
          queryString={queryString}
          seasonSelector={seasonSelector}
        />
      ) : hasSurvivorPools ? (
        // A season with survivor pools but no roster pool is not empty, so the
        // season selector still needs somewhere to live.
        <div className="flex justify-end">{seasonSelector}</div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-14 text-center">
          <div className="bg-muted rounded-full p-3">
            <Trophy className="text-muted-foreground size-6" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">
              {t("NoPoolFound", {
                season: seasonFormat(Number(params.season), 0),
              })}
            </p>
            <p className="text-muted-foreground max-w-sm text-sm">
              {t("NoPoolFoundDescription")}
            </p>
          </div>
          {seasonSelector}
          {createPoolButton}
        </div>
      )}

      {hasSurvivorPools ? (
        <SurvivorPoolList pools={survivorPools} queryString={queryString} />
      ) : null}
    </div>
  );
}
