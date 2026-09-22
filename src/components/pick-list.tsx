"use client";

import React from "react";
import { ArrowDownLeft, ArrowUpRight, CircleDot } from "lucide-react";
import { useTranslations } from "next-intl";

import { Pool, PoolUser } from "@/data/pool/model";
import { usePoolContext } from "@/context/pool-context";
import { PoolerNameText } from "./pooler-name";
import { useTradeBuilder } from "@/context/trade-builder-context";
import { getTradablePicks } from "@/lib/pool-picks";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  poolUser: PoolUser;
  poolInfo: Pool;
}

type PickOrigin = "own" | "acquired" | "traded";

interface RoundPick {
  // Pooler the pick originally belongs to (defines the draft slot).
  from: string;
  // Pooler that currently owns the pick.
  owner: string;
  origin: PickOrigin;
}

const pickStyle: Record<PickOrigin, string> = {
  own: "border-border bg-muted/50 text-foreground",
  acquired:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  traded:
    "border-dashed border-border bg-transparent text-muted-foreground opacity-70",
};

const pickIcon: Record<PickOrigin, React.ElementType> = {
  own: CircleDot,
  acquired: ArrowDownLeft,
  traded: ArrowUpRight,
};

export default function PickList(props: Props) {
  const t = useTranslations();
  const { dictUsers } = usePoolContext();
  const { openTradeForPick } = useTradeBuilder();

  const userName = (userId: string) => dictUsers[userId]?.name ?? userId;

  // Build, for each round, the picks the pooler owns plus the ones he used to
  // own but traded away, so the impact of the trades stays visible.
  const rounds = React.useMemo<RoundPick[][]>(
    () =>
      getTradablePicks(props.poolInfo).map((roundPicksOwner) =>
        Object.keys(roundPicksOwner)
          .filter(
            (from) =>
              roundPicksOwner[from] === props.poolUser.id ||
              from === props.poolUser.id,
          )
          .map((from) => {
            const owner = roundPicksOwner[from];
            const origin: PickOrigin =
              owner !== props.poolUser.id
                ? "traded"
                : from === props.poolUser.id
                  ? "own"
                  : "acquired";
            return { from, owner, origin };
          })
          // Own pick first, then the acquired ones, then the traded ones.
          .sort((a, b) => {
            const order: PickOrigin[] = ["own", "acquired", "traded"];
            return order.indexOf(a.origin) - order.indexOf(b.origin);
          }),
      ),
    [props.poolInfo, props.poolUser.id],
  );

  const allPicks = rounds.flat();
  const ownedCount = allPicks.filter((p) => p.origin !== "traded").length;
  const acquiredCount = allPicks.filter((p) => p.origin === "acquired").length;
  const tradedCount = allPicks.filter((p) => p.origin === "traded").length;

  const Pick = ({ pick, round }: { pick: RoundPick; round: number }) => {
    const Icon = pickIcon[pick.origin];
    const label =
      pick.origin === "traded"
        ? t("PickTradedTo", { poolerName: userName(pick.owner) })
        : pick.origin === "acquired"
          ? t("PickAcquiredFrom", { poolerName: userName(pick.from) })
          : t("PickOwnOriginal");

    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={`${t("RoundNumber", { round: round + 1 })} — ${label}`}
              onClick={() =>
                openTradeForPick({ round, from: pick.from }, pick.owner)
              }
              className={cn(
                "flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:hover:brightness-125",
                pickStyle[pick.origin],
              )}
            />
          }
        >
          <Icon aria-hidden="true" className="size-3 shrink-0" />
          {/* The own pick needs no name: the whole panel already belongs to
              this pooler, repeating it on every round is only noise. */}
          {pick.origin === "own" ? (
            <span className="truncate">{t("PickOwnOriginal")}</span>
          ) : (
            <PoolerNameText name={userName(pick.from)} className="max-w-24" />
          )}
          {pick.origin === "traded" ? (
            <>
              <span aria-hidden="true">→</span>
              <PoolerNameText
                name={userName(pick.owner)}
                className="max-w-24"
              />
            </>
          ) : null}
        </TooltipTrigger>
        <TooltipContent>
          <span className="block">{label}</span>
          <span className="block text-primary-foreground/70">
            {t("ClickToTrade")}
          </span>
        </TooltipContent>
      </Tooltip>
    );
  };

  const Stat = ({
    value,
    label,
    className,
  }: {
    value: number;
    label: string;
    className?: string;
  }) => (
    <div className="flex items-baseline gap-1">
      <span className={cn("text-sm font-semibold tabular-nums", className)}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );

  if (rounds.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {t("NoPicks")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Stat value={ownedCount} label={t("PicksOwned")} />
        {acquiredCount > 0 ? (
          <Stat
            value={acquiredCount}
            label={t("PicksAcquired")}
            className="text-emerald-600 dark:text-emerald-400"
          />
        ) : null}
        {tradedCount > 0 ? (
          <Stat
            value={tradedCount}
            label={t("PicksTradedAway")}
            className="text-muted-foreground"
          />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {rounds.map((picks, round) => {
          const owned = picks.filter((p) => p.origin !== "traded");
          return (
            <div
              key={round}
              className={cn(
                "rounded-md border bg-card p-1.5",
                // A round where every pick is gone stays visible but recedes.
                owned.length === 0 && "bg-muted/30",
                picks.some((p) => p.origin === "acquired") &&
                  "border-emerald-500/30",
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("RoundNumber", { round: round + 1 })}
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {picks.length === 0 ? (
                  <span className="py-0.5 text-[11px] text-muted-foreground">
                    {t("NoPickInRound")}
                  </span>
                ) : (
                  picks.map((pick) => (
                    <Pick
                      key={`${pick.from}-${pick.owner}-${round}`}
                      pick={pick}
                      round={round}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {acquiredCount === 0 && tradedCount === 0 ? (
        // No trade happened yet: explain that these picks can move.
        <p className="text-xs text-muted-foreground">{t("PicksTradeHint")}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CircleDot aria-hidden="true" className="size-3.5" />
            {t("PickOwnOriginalLegend")}
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft aria-hidden="true" className="size-3.5" />
            {t("PickAcquiredLegend")}
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
            {t("PickTradedLegend")}
          </span>
        </div>
      )}
    </div>
  );
}
