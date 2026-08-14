"use client";

import { usePoolContext } from "@/context/pool-context";
import { getPoolerAllPlayers, Pool, PoolUser } from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import * as React from "react";
import { ShieldAlertIcon, ShieldCheckIcon } from "lucide-react";
import { calculatePoolStats } from "../../in-progress/cumulative-tab/cumulative-calculation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ProtectionRoster from "@/components/protection-roster";
import { PoolerUserGlobalSelector } from "@/components/pool-user-selector";
import { useUser } from "@/context/useUserData";
import { useSession } from "@/context/useSessionData";

export default function RosterTab() {
  const {
    poolInfo,
    selectedParticipant,
    updateSelectedParticipant,
    updatePoolInfo,
    poolStartDate,
    poolSelectedEndDate,
    dailyPointsMade,
  } = usePoolContext();
  const userData = useUser();
  const userSession = useSession();

  const t = useTranslations();

  // Pool points made over the season that just ended, the only honest way to
  // weigh a contract when choosing who to keep. Same calculation as the
  // cumulative tab, run once for the whole pool.
  const playerPoolPoints = React.useMemo(() => {
    const [stats] = calculatePoolStats(
      poolInfo,
      poolStartDate,
      poolSelectedEndDate,
      dailyPointsMade,
    );
    if (stats === null) {
      return undefined;
    }

    const points: Record<number, number> = {};
    let total = 0;
    for (const roster of Object.values(stats)) {
      for (const player of [
        ...roster.forwards,
        ...roster.defense,
        ...roster.goalies,
      ]) {
        points[player.id] = player.poolPoints;
        total += player.poolPoints;
      }
    }

    // A season that was never scored has nothing to compare, the charts that
    // read production are then left out rather than showing a wall of zeros.
    return total > 0 ? points : undefined;
  }, [poolInfo, poolStartDate, poolSelectedEndDate, dailyPointsMade]);

  const protectionLimit =
    poolInfo.settings.dynasty_settings?.next_season_number_players_protected ??
    0;
  const participants: PoolUser[] = poolInfo.participants ?? [];

  const hasCompletedProtection = (user: PoolUser) =>
    (poolInfo.context?.protected_players?.[user.id]?.length ?? 0) >=
    protectionLimit;

  const readyCount = participants.filter(hasCompletedProtection).length;
  const selectedUser =
    participants.find((user) => user.name === selectedParticipant) ??
    participants[0];

  const onCompleteProtection = async () => {
    const res = await apiPost<Pool>(
      "/complete-protection",
      { pool_name: poolInfo.name },
      userSession.info?.jwt,
    );

    if (!res.ok) {
      toast.error(
        t("CouldNotCompleteProtection", {
          name: poolInfo.name,
          error: res.error,
        }),
        { duration: 5000 },
      );
      return;
    }

    updatePoolInfo(res.data);
    toast.success(t("SuccessCompleteProtection"), { duration: 2000 });
  };

  // Who is done and who is not, which is what everybody watches while the
  // protection window is open, and what tells the owner the draft can start.
  const LeagueProtectionStatus = () => (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-medium">{t("ProtectionStatus")}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {t("TeamsReady", {
            count: readyCount,
            total: participants.length,
          })}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {participants.map((user) => {
          const isReady = hasCompletedProtection(user);

          return (
            <button
              key={user.id}
              type="button"
              onClick={() => updateSelectedParticipant(user.name)}
              aria-pressed={user.name === selectedParticipant}
              className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Badge
                variant={isReady ? "secondary" : "outline"}
                className={cn(
                  "cursor-pointer gap-1 transition-colors hover:bg-accent hover:text-accent-foreground",
                  user.name === selectedParticipant && "ring-2 ring-ring/50",
                )}
              >
                {isReady ? (
                  <ShieldCheckIcon className="size-3.5 text-success" />
                ) : (
                  <ShieldAlertIcon className="size-3.5 text-muted-foreground" />
                )}
                {user.name}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );

  const StartDraftAlertDialog = () => (
    <AlertDialog>
      <AlertDialogTrigger render={<Button />}>
        {t("StartDraft")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("StartDraftAlertDialog")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("StartDraftAlertDialogQuestion")}
            {readyCount < participants.length
              ? ` ${t("StartDraftMissingTeams", {
                  count: participants.length - readyCount,
                })}`
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => onCompleteProtection()}>
            {t("Continue")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (!selectedUser || poolInfo.context === null) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 text-left">
      <div className="grid items-end gap-3 sm:grid-cols-2">
        <PoolerUserGlobalSelector />
        {LeagueProtectionStatus()}
      </div>

      <ProtectionRoster
        userRoster={getPoolerAllPlayers(poolInfo.context, selectedUser)}
        teamSalaryCap={poolInfo.settings.salary_cap}
        protectionLimit={protectionLimit}
        playerPoolPoints={playerPoolPoints}
      />

      {userData.info?.id === poolInfo.owner ? (
        <div className="flex justify-end">{StartDraftAlertDialog()}</div>
      ) : null}
    </div>
  );
}
