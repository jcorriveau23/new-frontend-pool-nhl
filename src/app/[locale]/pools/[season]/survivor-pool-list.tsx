/*
The season's survivor pools, listed under the roster pools.

A separate section rather than rows mixed into `PoolList`: they are a different
game — no roster, no draft, a different page — and the only things worth showing
about one in a list are how full it is and whether it has started.
*/

import { Swords, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { SurvivorPoolShort, SurvivorState } from "@/data/survivor/model";

const STATE_LABEL_KEY: Record<SurvivorState, string> = {
  [SurvivorState.Created]: "SurvivorPoolOpenToJoin",
  [SurvivorState.InProgress]: "PoolInProgressState",
  [SurvivorState.Final]: "SurvivorPoolOver",
};

export default async function SurvivorPoolList({
  pools,
  queryString,
}: {
  pools: SurvivorPoolShort[];
  queryString: string;
}) {
  const t = await getTranslations();

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
        {pools.map((pool) => (
          <li key={pool.name}>
            <Link
              href={`/survivor/${pool.name}?${queryString}`}
              className="hover:bg-accent flex flex-wrap items-center gap-3 px-4 py-3 transition-colors"
            >
              <span className="font-medium">{pool.name}</span>
              <Badge variant="outline">{t(STATE_LABEL_KEY[pool.status])}</Badge>
              <span className="text-muted-foreground ml-auto flex items-center gap-1.5 text-sm">
                <Users className="size-4" />
                {t("SurvivorParticipantCount", {
                  count: pool.participant_count,
                  max: pool.max_participants,
                })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
