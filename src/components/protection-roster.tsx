"use client";

import * as React from "react";
import { Player, Pool, PoolUser, Position } from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  InfoIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  ShieldMinusIcon,
  ShieldPlusIcon,
} from "lucide-react";
import { salaryFormat } from "@/app/utils/formating";
import { usePoolContext } from "@/context/pool-context";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";
import { cn } from "@/lib/utils";
import PlayerLink from "./player-link";
import PlayerSalary from "./player-salary";
import InformationIcon from "./information-box";
import { TeamLogo } from "./team-logo";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import ProtectionAnalysis from "./protection-analysis";

interface Roster {
  user: PoolUser;
  forwards: Player[];
  defense: Player[];
  goalies: Player[];
}

interface Props {
  userRoster: Roster;
  teamSalaryCap: number | null;
  // Number of players the pooler has to protect, from the dynasty settings.
  protectionLimit: number;
  // Pool points made this season by each player, behind the analysis charts.
  // Absent when the season was never scored.
  playerPoolPoints?: Record<number, number>;
}

type RosterGroup = "forwards" | "defense" | "goalies";

const GROUP_TITLE: Record<RosterGroup, string> = {
  forwards: "Forwards",
  defense: "Defense",
  goalies: "Goalies",
};

const POSITION_ORDER = [Position.F, Position.D, Position.G];

const bySalary = (players: Player[]): Player[] =>
  [...players].sort((p1, p2) => (p2.salary_cap ?? 0) - (p1.salary_cap ?? 0));

// The protected list mixes positions, grouping them keeps it readable.
const byPositionThenSalary = (players: Player[]): Player[] =>
  [...players].sort(
    (p1, p2) =>
      POSITION_ORDER.indexOf(p1.position) -
        POSITION_ORDER.indexOf(p2.position) ||
      (p2.salary_cap ?? 0) - (p1.salary_cap ?? 0),
  );

export default function ProtectionRoster(props: Props) {
  const { poolInfo, updatePoolInfo, dictUsers } = usePoolContext();
  const userSession = useSession();
  const userData = useUser();
  const t = useTranslations();

  const savedProtectedIds = React.useMemo(
    () => poolInfo.context?.protected_players?.[props.userRoster.user.id] ?? [],
    [poolInfo.context?.protected_players, props.userRoster.user.id],
  );

  const [protectedIds, setProtectedIds] =
    React.useState<number[]>(savedProtectedIds);
  const [isSaving, setIsSaving] = React.useState(false);

  // Only what is actually stored for this pooler wins over the local edits: a
  // participant switch or a save (his own, or one made by the owner) reseeds the
  // selection, any other pool update leaves the work in progress alone.
  const savedSignature = `${props.userRoster.user.id}:${[...savedProtectedIds]
    .sort((a, b) => a - b)
    .join(",")}`;
  const [renderedSignature, setRenderedSignature] =
    React.useState(savedSignature);
  if (renderedSignature !== savedSignature) {
    setRenderedSignature(savedSignature);
    setProtectedIds(savedProtectedIds);
  }

  // The backend only accepts a protection list from the pooler itself or from
  // the pool owner.
  const canEdit =
    userSession.info?.jwt !== undefined &&
    (userData.info?.id === props.userRoster.user.id ||
      userData.info?.id === poolInfo.owner);

  const allPlayers = [
    ...props.userRoster.forwards,
    ...props.userRoster.defense,
    ...props.userRoster.goalies,
  ];
  const protectedPlayers = allPlayers.filter((player) =>
    protectedIds.includes(player.id),
  );
  const isProtectionFull = protectedIds.length >= props.protectionLimit;

  const totalSalary = protectedPlayers.reduce(
    (total, player) => total + (player.salary_cap ?? 0),
    0,
  );
  const isOverCap =
    props.teamSalaryCap !== null && totalSalary > props.teamSalaryCap;

  const savedIdSet = new Set(savedProtectedIds);
  const changedPlayerCount = [
    ...new Set([...protectedIds, ...savedProtectedIds]),
  ].filter(
    (playerId) => protectedIds.includes(playerId) !== savedIdSet.has(playerId),
  ).length;
  const hasUnsavedChanges = changedPlayerCount > 0;

  // Same validation as the backend, reported before the request is sent so the
  // pooler knows what is left to do.
  const getBlockingIssue = (): string | null => {
    if (protectedIds.length > props.protectionLimit) {
      return t("TooManyProtectedPlayers", {
        count: protectedIds.length,
        limit: props.protectionLimit,
      });
    }
    if (protectedIds.length < props.protectionLimit) {
      return t("ProtectionRemaining", {
        count: props.protectionLimit - protectedIds.length,
      });
    }
    return null;
  };
  const blockingIssue = getBlockingIssue();

  const toggleProtection = (player: Player) => {
    if (!canEdit) {
      toast.error(
        t("CannotUpdateProtectedPlayers", {
          userName: props.userRoster.user.name,
        }),
        { duration: 5000 },
      );
      return;
    }

    if (protectedIds.includes(player.id)) {
      setProtectedIds((current) => current.filter((id) => id !== player.id));
      return;
    }

    if (isProtectionFull) {
      toast.error(
        t("TooMuchProtectedPlayers", { limit: props.protectionLimit }),
        {
          duration: 5000,
        },
      );
      return;
    }

    setProtectedIds((current) => [...current, player.id]);
  };

  const resetProtection = () => setProtectedIds(savedProtectedIds);

  const onSaveProtectedPlayers = async () => {
    setIsSaving(true);
    try {
      const res = await apiPost<Pool>(
        "/protect-players",
        {
          pool_name: poolInfo.name,
          protected_players_user_id: props.userRoster.user.id,
          protected_players: protectedIds,
        },
        userSession.info?.jwt,
      );

      if (!res.ok) {
        toast.error(
          t("CouldNotProtectPlayers", {
            name: poolInfo.name,
            error: res.error,
          }),
          { duration: 5000 },
        );
        return false;
      }

      updatePoolInfo(res.data);
      toast.success(t("SuccessProtectingPlayers"), { duration: 2000 });
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  // What a protection decision is really made on: production and price.
  const statLine = (player: Player): string =>
    (player.position === Position.G
      ? [
          player.game_played !== null
            ? `${player.game_played} ${t("GP")}`
            : null,
          player.wins !== null ? `${player.wins} ${t("W")}` : null,
          player.save_percentage != null
            ? `${player.save_percentage.toFixed(3)} ${t("s%")}`
            : null,
          player.goal_against_average != null
            ? `${player.goal_against_average.toFixed(2)} ${t("Gaa")}`
            : null,
        ]
      : [
          player.game_played !== null
            ? `${player.game_played} ${t("GP")}`
            : null,
          player.points !== null ? `${player.points} ${t("Pts")}` : null,
          player.points_per_game != null
            ? `${player.points_per_game.toFixed(2)} ${t("PTS/G")}`
            : null,
        ]
    )
      .filter((stat) => stat !== null)
      .join(" · ");

  const PlayerRow = (player: Player, index: number, isProtected: boolean) => {
    const actionLabel = isProtected
      ? t("UnprotectPlayer", { playerName: player.name })
      : isProtectionFull
        ? t("ProtectionSlotsFull")
        : t("ProtectPlayer", { playerName: player.name });

    return (
      <li
        key={player.id}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
      >
        <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {index + 1}
        </span>
        <TeamLogo teamId={player.team} width={24} height={24} />
        <div className="min-w-0 flex-1">
          <PlayerLink
            name={player.name}
            id={player.id}
            textStyle="text-sm font-medium"
          />
          <p className="truncate text-xs text-muted-foreground">
            {[
              isProtected ? t(player.position) : null,
              player.age !== null ? t("AgeYears", { age: player.age }) : null,
              statLine(player),
            ]
              .filter((part) => part)
              .join(" · ")}
          </p>
        </div>
        {props.teamSalaryCap !== null ? (
          <PlayerSalary
            playerName={player.name}
            team={player.team}
            salary={player.salary_cap}
            contractExpirationSeason={player.contract_expiration_season}
            teamSalaryCap={props.teamSalaryCap}
            onBadgeClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        ) : null}
        {canEdit ? (
          <Tooltip>
            {/* The trigger wraps the button instead of being it: a full
                protection list disables the button, and a disabled button never
                reports the hover that explains why. */}
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={actionLabel}
                disabled={!isProtected && isProtectionFull}
                onClick={() => toggleProtection(player)}
              >
                {isProtected ? (
                  <ShieldMinusIcon className="size-4" />
                ) : (
                  <ShieldPlusIcon className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{actionLabel}</TooltipContent>
          </Tooltip>
        ) : null}
      </li>
    );
  };

  // What a group of players weighs on the cap, and the share of the cap it eats.
  const GroupSalary = (players: Player[], tooltip: string) => {
    if (props.teamSalaryCap === null) {
      return null;
    }

    const groupSalary = players.reduce(
      (total, player) => total + (player.salary_cap ?? 0),
      0,
    );

    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <span className="text-xs tabular-nums text-muted-foreground">
            {salaryFormat(groupSalary)}
            <span className="ml-1 opacity-70">
              {t("PercentOfCap", {
                percent: Math.round((groupSalary / props.teamSalaryCap!) * 100),
              })}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  };

  const ExposedSection = (group: RosterGroup) => {
    const players = bySalary(props.userRoster[group]).filter(
      (player) => !protectedIds.includes(player.id),
    );

    return (
      <section className="rounded-xl border bg-card">
        <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{t(GROUP_TITLE[group])}</h3>
            <Badge variant="outline" className="tabular-nums">
              {players.length}
            </Badge>
          </div>
          {GroupSalary(
            players,
            t("ExposedSalaryTotal", { position: t(GROUP_TITLE[group]) }),
          )}
        </header>
        <ul className="p-1.5">
          {players.length === 0 ? (
            <li className="px-2 py-4 text-center text-xs text-muted-foreground">
              {t("AllPlayersProtected")}
            </li>
          ) : (
            players.map((player, i) => PlayerRow(player, i, false))
          )}
        </ul>
      </section>
    );
  };

  const ProtectedSection = () => {
    const players = byPositionThenSalary(protectedPlayers);
    const emptySlots = Math.max(0, props.protectionLimit - players.length);

    return (
      <section className="rounded-xl border bg-card">
        <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{t("ProtectedPlayers")}</h3>
            <Badge
              variant={
                players.length > props.protectionLimit
                  ? "destructive"
                  : players.length === props.protectionLimit
                    ? "secondary"
                    : "outline"
              }
              className="tabular-nums"
            >
              {players.length}/{props.protectionLimit}
            </Badge>
          </div>
          {GroupSalary(players, t("ProtectedSalaryTotal"))}
        </header>
        <ul className="p-1.5">
          {players.map((player, i) => PlayerRow(player, i, true))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <li
              key={`empty-protection-${i}`}
              className="m-1 flex items-center gap-2 rounded-md border border-dashed px-2 py-1.5"
            >
              <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {players.length + i + 1}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("EmptyProtectionSlot")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  };

  const ProtectionSummary = () => (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">{t("ProtectionProgress")}</span>
          <InformationIcon text={t("ProtectionProgressHint")} />
        </div>
        <p className="text-sm tabular-nums">
          <span className="font-semibold">{protectedIds.length}</span>
          <span className="text-muted-foreground">
            {" / "}
            {props.protectionLimit}
          </span>
        </p>
      </div>
      <Progress
        value={Math.min(
          100,
          (protectedIds.length / Math.max(1, props.protectionLimit)) * 100,
        )}
        className="mt-2 h-1.5"
      />
      <p
        className={cn(
          "mt-2 text-xs font-medium",
          blockingIssue ? "text-muted-foreground" : "text-success",
        )}
      >
        {blockingIssue ?? t("ProtectionComplete")}
      </p>
    </div>
  );

  const SalarySummary = (teamSalaryCap: number) => {
    const contractCount = protectedPlayers.filter(
      (player) => player.salary_cap !== null,
    ).length;

    return (
      <div className="rounded-xl border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">
              {t("ProtectedSalaryUsed")}
            </span>
            <InformationIcon text={t("ProtectedSalaryUsedHint")} />
          </div>
          <p className="text-sm tabular-nums">
            <span
              className={cn("font-semibold", isOverCap && "text-destructive")}
            >
              {salaryFormat(totalSalary)}
            </span>
            <span className="text-muted-foreground">
              {" / "}
              {salaryFormat(teamSalaryCap)}
            </span>
          </p>
        </div>
        <Progress
          value={Math.min(100, (totalSalary / teamSalaryCap) * 100)}
          className={cn("mt-2 h-1.5", isOverCap && "bg-destructive/20")}
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span
            className={cn(
              "font-medium",
              isOverCap ? "text-destructive" : "text-success",
            )}
          >
            {isOverCap
              ? t("OverCap", {
                  diff: salaryFormat(totalSalary - teamSalaryCap),
                })
              : t("UnderCap", {
                  diff: salaryFormat(teamSalaryCap - totalSalary),
                })}
          </span>
          <span className="text-muted-foreground">
            {t("ProtectedPlayersCount", {
              playersCount: protectedPlayers.length,
              contractCount,
            })}
          </span>
        </div>
      </div>
    );
  };

  const ProtectionPanel = () => (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {ProtectionSummary()}
        {props.teamSalaryCap !== null
          ? SalarySummary(props.teamSalaryCap)
          : null}
      </div>
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          {props.userRoster.forwards.length > 0
            ? ExposedSection("forwards")
            : null}
          {props.userRoster.defense.length > 0
            ? ExposedSection("defense")
            : null}
          {props.userRoster.goalies.length > 0
            ? ExposedSection("goalies")
            : null}
        </div>
        {/* The protection list is what the pooler is actually building, it comes
            first when there is no room to show both columns side by side. */}
        <div className="order-first min-w-0 lg:order-last lg:sticky lg:top-2">
          {ProtectedSection()}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 text-left">
      {props.teamSalaryCap !== null ? (
        <Tabs defaultValue="protection">
          <TabsList>
            <TabsTrigger value="protection">{t("Protection")}</TabsTrigger>
            <TabsTrigger value="analysis">{t("Analysis")}</TabsTrigger>
          </TabsList>
          <TabsContent value="protection">{ProtectionPanel()}</TabsContent>
          <TabsContent value="analysis">
            <ProtectionAnalysis
              protectedLineup={{
                forwards: protectedPlayers.filter(
                  (player) => player.position === Position.F,
                ),
                defense: protectedPlayers.filter(
                  (player) => player.position === Position.D,
                ),
                goalies: protectedPlayers.filter(
                  (player) => player.position === Position.G,
                ),
              }}
              rosterPlayers={allPlayers}
              teamSalaryCap={props.teamSalaryCap}
              playerPoolPoints={props.playerPoolPoints}
            />
          </TabsContent>
        </Tabs>
      ) : (
        ProtectionPanel()
      )}

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 border-t bg-background/95 py-3 backdrop-blur">
        <div className="min-w-0 text-xs">
          {!canEdit ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <InfoIcon className="size-4 shrink-0" />
              {t("ProtectionReadOnlyHint", {
                userName: dictUsers[props.userRoster.user.id]?.name ?? "",
              })}
            </p>
          ) : blockingIssue ? (
            <p className="flex items-center gap-1.5 font-medium text-destructive">
              <AlertCircleIcon className="size-3.5 shrink-0" />
              {blockingIssue}
            </p>
          ) : hasUnsavedChanges ? (
            <p className="text-muted-foreground">
              {t("UnsavedLineupChanges", { count: changedPlayerCount })}
            </p>
          ) : (
            <p className="text-muted-foreground">{t("LineupUpToDate")}</p>
          )}
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasUnsavedChanges || isSaving}
              onClick={resetProtection}
            >
              <RotateCcwIcon />
              {t("Reset")}
            </Button>
            <Button
              size="sm"
              disabled={
                !hasUnsavedChanges || blockingIssue !== null || isSaving
              }
              onClick={() => onSaveProtectedPlayers()}
            >
              {isSaving ? <LoaderCircleIcon className="animate-spin" /> : null}
              {t("Save")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
