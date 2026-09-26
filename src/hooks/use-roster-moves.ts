/*
Putting a player on a pooler's bench, and taking one off their roster.

Both are the owner's tools rather than a pooler's: no drop budget is spent and
nothing comes back in return, which is what separates them from a waiver claim.
Both are also filed from more than one screen — the lineup dialog and the
cumulative tab's roster tables — so the request, the toast it reports with and
the pool it hands back live here instead of once per screen, where they would
drift apart on what a removal says or does.
*/
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { hasPoolPrivilege, usePoolContext } from "@/context/pool-context";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";
import { Player, Pool, PoolState } from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";

export interface RosterMoves {
  // Whether the signed in user may add to and remove from a roster at all: the
  // owner and the assistants, on a running pool. The same rule the backend
  // applies, so callers hide what would only come back refused.
  canManageRoster: boolean;
  // The player a move is in flight for. Callers show a spinner on it and lock
  // their buttons: neither move is something to file twice by accident.
  pendingPlayerId: number | null;
  // Both resolve to whether the move landed, which is what a search dialog
  // needs to decide between closing and staying open for another try.
  addPlayer: (participantId: string, player: Player) => Promise<boolean>;
  removePlayer: (participantId: string, player: Player) => Promise<boolean>;
}

export function useRosterMoves(): RosterMoves {
  const { poolInfo, updatePoolInfo, dictUsers } = usePoolContext();
  const userSession = useSession();
  const userData = useUser();
  const t = useTranslations();

  const [pendingPlayerId, setPendingPlayerId] = React.useState<number | null>(
    null,
  );

  const canManageRoster =
    poolInfo.status === PoolState.InProgress &&
    hasPoolPrivilege(userData.info?.id, poolInfo);

  // A pooler the pool no longer lists would leave the toast with a blank name,
  // which reads as a bug rather than as the edge case it is.
  const nameOf = (participantId: string) =>
    dictUsers[participantId]?.name ?? participantId;

  const file = async (
    player: Player,
    path: string,
    body: object,
    failure: (error: string) => string,
    success: () => string,
  ): Promise<boolean> => {
    setPendingPlayerId(player.id);
    try {
      const res = await apiPost<Pool>(path, body, userSession.info?.jwt);

      if (!res.ok) {
        toast.error(failure(res.error), { duration: 5000 });
        return false;
      }

      updatePoolInfo(res.data);
      toast.success(success(), { duration: 2000 });
      return true;
    } finally {
      setPendingPlayerId(null);
    }
  };

  const addPlayer = (participantId: string, player: Player) =>
    file(
      player,
      "/add-player",
      {
        pool_name: poolInfo.name,
        added_player_user_id: participantId,
        player: player,
      },
      (error) =>
        t("CouldNotAddPlayerToRoster", {
          playerName: player.name,
          userName: nameOf(participantId),
          error,
        }),
      () =>
        t("SuccessAddPlayerToRoster", {
          playerName: player.name,
          userName: nameOf(participantId),
        }),
    );

  const removePlayer = (participantId: string, player: Player) =>
    file(
      player,
      "/remove-player",
      {
        pool_name: poolInfo.name,
        removed_player_user_id: participantId,
        player_id: player.id,
      },
      (error) =>
        t("CouldNotRemovePlayerFromRoster", {
          playerName: player.name,
          userName: nameOf(participantId),
          error,
        }),
      () =>
        t("SuccessRemovePlayerFromRoster", {
          playerName: player.name,
          userName: nameOf(participantId),
        }),
    );

  return { canManageRoster, pendingPlayerId, addPlayer, removePlayer };
}
