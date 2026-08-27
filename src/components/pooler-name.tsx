"use client";
import { usePoolContext } from "@/context/pool-context";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// The badge that marks the connected user's own team wherever poolers are
// listed. It is what keeps their row findable once they select somebody else
// to compare against, since the row highlight follows the selection.
export function YouBadge({ className }: { className?: string }) {
  const t = useTranslations();

  return (
    <span
      className={cn(
        "shrink-0 rounded-sm bg-primary/15 px-1 py-px text-[9px] font-semibold uppercase leading-normal tracking-wide text-primary sm:text-[10px]",
        className
      )}
    >
      {t("You")}
    </span>
  );
}

interface PoolerNameProps {
  name: string;
  className?: string;
}

// A pooler's name carrying the two markers the pool pages share: a leading dot
// for the pooler of interest, so the active row is easy to spot in a ranking,
// and the "you" badge above for the connected user. Reads the pool context
// directly rather than going through the table meta, so every table renders
// them the same way.
export function PoolerName({ name, className }: PoolerNameProps) {
  const { selectedParticipant, userPoolUser } = usePoolContext();

  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      {name === selectedParticipant ? (
        <span
          className="size-1.5 shrink-0 rounded-full bg-primary"
          aria-hidden
        />
      ) : null}
      {name}
      {userPoolUser?.name === name ? <YouBadge /> : null}
    </span>
  );
}
