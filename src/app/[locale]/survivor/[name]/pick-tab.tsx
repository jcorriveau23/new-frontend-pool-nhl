"use client";

/*
The pick screen: the teams playing a Saturday, and the one you are backing.

The teams you have already used are shown rather than hidden. Deep into a
season "why can I not pick Toronto" is the question the screen most has to
answer, and an absent tile answers nothing.

What is open to you comes from the backend, which decides it with the same
function it validates the pick against — so a tile being enabled and the pick
being accepted cannot disagree.
*/

import * as React from "react";
import { Check, Lock, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamLogo } from "@/components/team-logo";
import team_info from "@/lib/teams";
import { cn } from "@/lib/utils";
import {
  SurvivorPickOptions,
  SurvivorPool,
  SurvivorUser,
  SurvivorWeek,
} from "@/data/survivor/model";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  hasSurvivorPrivilege,
  pickBlockedReasonKey,
  splitTeamChoices,
} from "@/lib/survivor";
import { fetchPickOptions, makeSurvivorPick } from "@/lib/survivor-api";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";

interface Props {
  pool: SurvivorPool;
  week: SurvivorWeek;
  participant: SurvivorUser | null;
}

const teamName = (teamId: number) =>
  team_info[teamId]?.fullName ?? `#${teamId}`;

function TeamTile({
  teamId,
  state,
  onPick,
  disabled,
}: {
  teamId: number;
  state: "picked" | "open" | "used";
  onPick: () => void;
  disabled: boolean;
}) {
  const t = useTranslations();
  const name = teamName(teamId);

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled || state === "used"}
      aria-pressed={state === "picked"}
      aria-label={
        state === "used" ? t("SurvivorTeamUsedLabel", { team: name }) : name
      }
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        state === "picked" && "border-primary bg-primary/10",
        state === "open" && "hover:bg-accent cursor-pointer",
        // A used team stays legible but visibly out of play, and says why on
        // hover rather than vanishing from the grid.
        state === "used" && "cursor-not-allowed opacity-40",
        disabled && state !== "picked" && "cursor-not-allowed opacity-60",
      )}
      title={state === "used" ? t("SurvivorTeamAlreadyUsed") : name}
    >
      <TeamLogo teamId={teamId} width={40} height={40} alt={name} />
      <span className="line-clamp-2 text-xs leading-tight">{name}</span>
      {state === "picked" ? (
        <Check className="text-primary absolute top-1 right-1 size-4" />
      ) : null}
      {state === "used" ? (
        <Lock className="text-muted-foreground absolute top-1 right-1 size-3" />
      ) : null}
    </button>
  );
}

export default function PickTab(props: Props) {
  const { pool, week, participant } = props;
  const t = useTranslations();
  const userSession = useSession();
  const jwt = userSession.info?.jwt;

  const userData = useUser();
  const canPickForOthers = hasSurvivorPrivilege(pool, userData.info?.id);

  const [options, setOptions] = React.useState<SurvivorPickOptions | null>(
    null,
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [pickingTeam, setPickingTeam] = React.useState<number | null>(null);

  /*
  Whose pick the screen is filing.

  The organiser's own spot by default. They switch to one of the spots they
  keep on somebody's behalf — those people have no account, so this is the only
  way those picks ever get made. Null means "mine", so a plain participant
  never sends a participant id at all.
  */
  const [pickingFor, setPickingFor] = React.useState<string | null>(null);

  const loadOptions = React.useCallback(async () => {
    if (!jwt) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const res = await fetchPickOptions(
      pool.name,
      week.week,
      jwt,
      pickingFor ?? undefined,
    );
    setIsLoading(false);

    if (!res.ok) {
      // A visitor who is not in the pool gets a refusal here, which is not
      // worth a toast — the screen already says they are not a participant.
      if (participant !== null) {
        toast.error(t("SurvivorCouldNotLoadPicks", { error: res.error }));
      }
      return;
    }
    setOptions(res.data);
  }, [jwt, pool.name, week.week, pickingFor, participant, t]);

  React.useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const pick = async (teamId: number) => {
    setPickingTeam(teamId);
    const res = await makeSurvivorPick(
      pool.name,
      week.week,
      teamId,
      jwt,
      pickingFor ?? undefined,
    );
    setPickingTeam(null);

    if (!res.ok) {
      toast.error(res.error, { duration: 5000 });
      // The refusal may be a team somebody's concurrent pick took, or a date
      // that locked while this screen was open; either way what is on screen
      // is stale.
      void loadOptions();
      return;
    }

    setOptions(res.data);
    toast.success(t("SurvivorPickSaved", { team: teamName(teamId) }));
  };

  // The teams playing come from the pick endpoint, which resolves them against
  // the league's schedule. The pool's own copy of the week is only filled in
  // once the date is locked, so it would read as "no games" on every open one.
  // The spot being filed for, which is the organiser's own unless they have
  // switched. Its standing is what decides whether a pick can be made.
  const subject =
    pickingFor === null
      ? participant
      : (pool.participants.find((p) => p.id === pickingFor) ?? null);

  const blockedKey = pickBlockedReasonKey(
    week,
    subject,
    options?.eligible_team_ids ?? null,
    options?.is_blocked ?? false,
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
        {Array.from({ length: 16 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
    );
  }

  // Not a participant, or not signed in: the grid would have nothing to act on.
  if (options === null) {
    return (
      <Alert>
        <TriangleAlert className="size-4" />
        <AlertDescription>
          {t(blockedKey ?? "SurvivorNotAParticipant")}
        </AlertDescription>
      </Alert>
    );
  }

  const { available, used } = splitTeamChoices(
    options.eligible_team_ids,
    options.available_team_ids,
  );
  // Used teams go last, so the ones that can be acted on are not spread out
  // among the ones that cannot.
  const ordered = [...available, ...used];
  const openTeams = new Set(available);

  return (
    <div className="space-y-4 text-left">
      {canPickForOthers && pool.participants.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {t("SurvivorPickingFor")}
          </span>
          <Select
            value={pickingFor ?? "__me__"}
            onValueChange={(value) =>
              setPickingFor(value === "__me__" ? null : value)
            }
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__me__">{t("SurvivorMyself")}</SelectItem>
              {pool.participants
                .filter((person) => person.id !== participant?.id)
                .map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                    {person.is_owned ? "" : ` ${t("SurvivorManagedSuffix")}`}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {t("SurvivorWeekLabel", { week: week.week })}
        </Badge>
        <span className="text-muted-foreground text-sm">{week.pick_date}</span>
        {options.current_pick !== null ? (
          <Badge>
            {t("SurvivorYourPick", { team: teamName(options.current_pick) })}
          </Badge>
        ) : null}
        <span className="text-muted-foreground ml-auto text-sm">
          {t("SurvivorTeamsLeft", {
            count: options.eligible_team_ids.length - used.length,
          })}
        </span>
      </div>

      {blockedKey !== null ? (
        <Alert>
          <TriangleAlert className="size-4" />
          <AlertDescription>{t(blockedKey)}</AlertDescription>
        </Alert>
      ) : null}

      {ordered.length === 0 ? (
        <Alert>
          <AlertDescription>{t("SurvivorNoGamesThatDay")}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
          {ordered.map((teamId) => (
            <TeamTile
              key={teamId}
              teamId={teamId}
              state={
                options.current_pick === teamId
                  ? "picked"
                  : openTeams.has(teamId)
                    ? "open"
                    : "used"
              }
              onPick={() => void pick(teamId)}
              disabled={
                !options.can_pick || blockedKey !== null || pickingTeam !== null
              }
            />
          ))}
        </div>
      )}

      {used.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {t("SurvivorUsedTeamsExplanation")}
        </p>
      ) : null}
    </div>
  );
}
