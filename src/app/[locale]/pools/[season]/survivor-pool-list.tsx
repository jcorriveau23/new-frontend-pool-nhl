"use client";

/*
The season's survivor pools, listed under the roster pools.

A separate section rather than rows mixed into `PoolList`: they are a different
game — no roster, no draft, a different page — and the only things worth showing
about one in a list are how full it is and whether it has started.

A client component for one reason: favorites are a per-device preference held in
localStorage, so pinning them at the top of the list is something only the
browser can do. The rows themselves are still rendered from what the server
fetched.
*/

import * as React from "react";
import { Swords, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import FavoritePoolButton from "@/components/favorite-pool-button";
import { Link } from "@/i18n/routing";
import { useFavoritePools } from "@/hooks/use-favorite-pools";
import { SurvivorPoolShort, SurvivorState } from "@/data/survivor/model";

const STATE_LABEL_KEY: Record<SurvivorState, string> = {
  [SurvivorState.Created]: "SurvivorPoolOpenToJoin",
  [SurvivorState.InProgress]: "PoolInProgressState",
  [SurvivorState.Final]: "SurvivorPoolOver",
};

export default function SurvivorPoolList({
  pools,
  queryString,
}: {
  pools: SurvivorPoolShort[];
  queryString: string;
}) {
  const t = useTranslations();
  const { isFavorite } = useFavoritePools();

  // Favorites first, then by name, which is the order `PoolList` reads in too.
  const ordered = React.useMemo(
    () =>
      [...pools].sort((a, b) => {
        const favoriteDelta =
          Number(isFavorite("survivor", b.name)) -
          Number(isFavorite("survivor", a.name));
        return favoriteDelta !== 0
          ? favoriteDelta
          : a.name.localeCompare(b.name);
      }),
    [pools, isFavorite],
  );

  if (pools.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 space-y-3 text-left">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Swords className="size-5" />
        {t("SurvivorPools")}
      </h2>
      <ul className="divide-y rounded-lg border">
        {ordered.map((pool) => (
          // The link is stretched over the whole row rather than wrapping it, so
          // the favorite button stays a sibling instead of a button inside a
          // link — the same shape a roster pool's card has.
          <li
            key={pool.name}
            className="hover:bg-muted/50 focus-within:ring-ring relative flex flex-wrap items-center gap-3 px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-inset"
          >
            <Link
              href={`/survivor/${pool.name}?${queryString}`}
              className="font-medium after:absolute after:inset-0 focus-visible:outline-none"
            >
              {pool.name}
            </Link>
            <Badge variant="outline">{t(STATE_LABEL_KEY[pool.status])}</Badge>
            <span className="text-muted-foreground ml-auto flex items-center gap-1.5 text-sm">
              <Users className="size-4" />
              {t("SurvivorParticipantCount", {
                count: pool.participant_count,
                max: pool.max_participants,
              })}
            </span>
            <div className="relative -my-1 -mr-2 shrink-0">
              <FavoritePoolButton
                poolName={pool.name}
                kind="survivor"
                season={pool.season}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
