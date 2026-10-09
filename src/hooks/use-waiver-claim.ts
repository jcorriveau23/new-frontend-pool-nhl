/*
Placing a player on waivers and picking up the free agent replacing him.

Filed from more than one screen — the lineup dialog and the row menu of the
cumulative tab's roster tables — so the budget, the rights, the request, the day
it counts from and the toast it reports with live here instead of once per
screen, where they would drift apart on who may claim or what a claim says.
*/
"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { hasPoolPrivilege, usePoolContext } from "@/context/pool-context";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";
import { Player, Pool, PoolState } from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";
import {
  DropBudget,
  getDropBudget,
  getSwapLanding,
  isFreeAgent,
} from "@/lib/player-drops";
import { BackdateRange, getBackdateRange } from "@/lib/roster-modification";

export interface WaiverClaim {
  budget: DropBudget;
  // Whether the signed in user may claim on this pooler's roster at all: the
  // pool has waivers and is running, and the roster is theirs or they are the
  // owner or an assistant — the same rule the backend applies.
  canClaim: boolean;
  // Why a claim filed now would be refused even though `canClaim` holds: the
  // budget is spent or the season is over. Null when nothing stands in the way.
  blockedReason: string | null;
  // The player being placed on waivers, whose replacement is being picked.
  // Setting it is what opens the search dialog.
  playerToDrop: Player | null;
  setPlayerToDrop: (player: Player | null) => void;
  isClaiming: boolean;
  // The days the claim may be made to count from, and the one picked. A claim
  // that should have gone through last week has to count from last week, or the
  // days in between are scored with the player who was dropped.
  backdateRange: BackdateRange;
  effectiveDate: string;
  setEffectiveDate: (date: string) => void;
  // Whether the signed in user may move that day at all. Backdating rewrites
  // days already scored, so it is the owner's and the assistants' to do — a
  // pooler free to backdate their own claim could wait to see which free agent
  // got hot and then claim him as of before he did.
  canBackdate: boolean;
  // Why `player` cannot be the replacement, shown on the search result rather
  // than left to fail once the claim is sent.
  replacementUnavailableReason: (player: Player) => string | null;
  // Resolves to whether the claim landed, so the search dialog knows whether
  // to close or stay open for another pick.
  claim: (replacement: Player) => Promise<boolean>;
}

export function useWaiverClaim(participantId: string): WaiverClaim {
  const { poolInfo, updatePoolInfo, playersOwner } = usePoolContext();
  const userSession = useSession();
  const userData = useUser();
  const t = useTranslations();
  const locale = useLocale();

  const [playerToDrop, setPlayerToDrop] = React.useState<Player | null>(null);
  const [isClaiming, setIsClaiming] = React.useState(false);

  // Fixed for as long as the screen is open: a date that moved under the user
  // between picking it and claiming would file the swap on a day they never
  // chose.
  const backdateRange = React.useMemo(
    () => getBackdateRange(poolInfo, new Date()),
    [poolInfo],
  );
  const [effectiveDate, setEffectiveDate] = React.useState(
    backdateRange.defaultDate,
  );

  // Unlike a lineup change, a claim is not tied to the pool's modification
  // dates — it can be filed any day of the season. Backdated, it is counted
  // against the budget of the period it counts for rather than the one it is
  // filed in, which is the rule the backend applies.
  const budget = React.useMemo(
    () => getDropBudget(poolInfo, participantId, new Date(), effectiveDate),
    [poolInfo, participantId, effectiveDate],
  );

  const canClaim =
    budget.isEnabled &&
    poolInfo.status === PoolState.InProgress &&
    (userData.info?.id === participantId ||
      hasPoolPrivilege(userData.info?.id, poolInfo));

  const canBackdate =
    backdateRange.canBackdate && hasPoolPrivilege(userData.info?.id, poolInfo);

  const blockedReason = budget.isSeasonOver
    ? t("FreeAgencyClosedForTheSeason")
    : budget.remaining === 0
      ? t("NoDropLeft")
      : null;

  // The saved roster the backend acts on.
  const savedRoster = poolInfo.context?.pooler_roster[participantId];

  const replacementUnavailableReason = (player: Player): string | null => {
    if (!isFreeAgent(player, playersOwner)) {
      return t("PlayerHeldBy", { userName: playersOwner[player.id] });
    }
    if (
      playerToDrop !== null &&
      savedRoster !== undefined &&
      getSwapLanding(poolInfo, savedRoster, playerToDrop.id, player) ===
        "no-room"
    ) {
      return t("NoRoomForPlayer");
    }
    return null;
  };

  const formatDate = (dateKey: string) =>
    new Date(`${dateKey}T00:00:00`).toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  const claim = async (replacement: Player): Promise<boolean> => {
    const dropped = playerToDrop;
    if (dropped === null) {
      return false;
    }

    setIsClaiming(true);
    try {
      const res = await apiPost<Pool>(
        "/drop-add-player",
        {
          pool_name: poolInfo.name,
          participant_id: participantId,
          dropped_player_id: dropped.id,
          added_player: replacement,
          // Absent unless the claim is actually backdated, so an ordinary one
          // sends the request it always sent.
          ...(effectiveDate === backdateRange.defaultDate
            ? {}
            : { effective_date: effectiveDate }),
        },
        userSession.info?.jwt,
      );

      if (!res.ok) {
        toast.error(
          t("CouldNotSwapPlayer", {
            droppedPlayerName: dropped.name,
            addedPlayerName: replacement.name,
            error: res.error,
          }),
          { duration: 5000 },
        );
        return false;
      }

      updatePoolInfo(res.data);
      toast.success(
        t("SuccessSwapPlayer", {
          droppedPlayerName: dropped.name,
          addedPlayerName: replacement.name,
          date: formatDate(budget.effectiveDate),
        }),
        { duration: 4000 },
      );
      setPlayerToDrop(null);
      return true;
    } finally {
      setIsClaiming(false);
    }
  };

  return {
    budget,
    canClaim,
    blockedReason,
    playerToDrop,
    setPlayerToDrop,
    isClaiming,
    backdateRange,
    effectiveDate,
    setEffectiveDate,
    canBackdate,
    replacementUnavailableReason,
    claim,
  };
}
