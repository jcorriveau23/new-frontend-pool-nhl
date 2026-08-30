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

interface PoolerNameTextProps {
  name: string | undefined;
  // Applied to the wrapper: this is where a caller widens or narrows the cut
  // (`max-w-*`), or drops it entirely with `max-w-none`.
  className?: string;
  isYou?: boolean;
  isSelected?: boolean;
}

// Every pooler name in the app goes through here. Nothing stops a pooler from
// registering with an email address, and one long name used to stretch its
// column and squeeze everything else out of the row, so the name is capped and
// cut with an ellipsis, with the full value kept in the native tooltip. The
// markers ride along because they must stay readable next to the cut name: the
// leading dot for the pooler of interest, and the "you" badge, both of which
// keep their width instead of being truncated with the name.
export function PoolerNameText({
  name,
  className,
  isYou = false,
  isSelected = false,
}: PoolerNameTextProps) {
  return (
    <span
      className={cn(
        "flex min-w-0 max-w-[140px] items-center gap-1.5 sm:max-w-[200px]",
        className
      )}
    >
      {isSelected ? (
        <span
          className="size-1.5 shrink-0 rounded-full bg-primary"
          aria-hidden
        />
      ) : null}
      <span className="truncate" title={name}>
        {name}
      </span>
      {isYou ? <YouBadge /> : null}
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
// them the same way. Use PoolerNameText instead where the markers come from
// something other than the pool context, such as a user id comparison.
export function PoolerName({ name, className }: PoolerNameProps) {
  const { selectedParticipant, userPoolUser } = usePoolContext();

  return (
    <PoolerNameText
      name={name}
      className={className}
      isSelected={name === selectedParticipant}
      isYou={userPoolUser?.name === name}
    />
  );
}
