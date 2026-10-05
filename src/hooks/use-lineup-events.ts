/*
Re-dating and dropping a recorded lineup change.

The pool's `lineup_events` are not a report of what happened — they are what the
scoring reads: the lineup on any day is the latest event on or before it. So a
correction filed on the wrong day leaves every day between the one it should
have counted from and the one it carries scoring the roster it was meant to
replace. Re-dating the event is how that is put right after the fact, and
dropping it is how an event filed by mistake is taken back, its days falling
back on the event before it.

The owner's and the assistants' tool, since it rewrites days already scored.
*/
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { hasPoolPrivilege, usePoolContext } from "@/context/pool-context";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";
import { Pool, PoolState } from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";
import { BackdateRange, getBackdateRange } from "@/lib/roster-modification";

export interface LineupEventEdits {
  // Whether the signed in user may edit the history at all. The same rule the
  // backend applies, so the UI hides what would only come back refused.
  canEdit: boolean;
  // The days an event may be moved to: opening night through today, the same
  // range a move filed now may count from.
  backdateRange: BackdateRange;
  // The event an edit is in flight for, as "participantId@date", so a row can
  // show a spinner and lock its own buttons without locking the others.
  pendingEvent: string | null;
  // Both resolve to whether the edit landed, which is what a dialog needs to
  // decide between closing and staying open for another try.
  reDate: (
    participantId: string,
    fromDate: string,
    toDate: string,
  ) => Promise<boolean>;
  drop: (participantId: string, fromDate: string) => Promise<boolean>;
}

export const eventKey = (participantId: string, date: string) =>
  `${participantId}@${date}`;

export function useLineupEvents(): LineupEventEdits {
  const { poolInfo, updatePoolInfo, dictUsers } = usePoolContext();
  const userSession = useSession();
  const userData = useUser();
  const t = useTranslations();

  const [pendingEvent, setPendingEvent] = React.useState<string | null>(null);

  const canEdit =
    poolInfo.status === PoolState.InProgress &&
    hasPoolPrivilege(userData.info?.id, poolInfo);

  // Fixed for as long as the screen is open: a date moving under the user
  // between picking it and saving would file the edit on a day they never
  // chose.
  const backdateRange = React.useMemo(
    () => getBackdateRange(poolInfo, new Date()),
    [poolInfo],
  );

  // A pooler the pool no longer lists would leave the toast with a blank name,
  // which reads as a bug rather than as the edge case it is.
  const nameOf = (participantId: string) =>
    dictUsers[participantId]?.name ?? participantId;

  const file = async (
    participantId: string,
    fromDate: string,
    toDate: string | null,
    failure: (error: string) => string,
    success: () => string,
  ): Promise<boolean> => {
    setPendingEvent(eventKey(participantId, fromDate));
    try {
      const res = await apiPost<Pool>(
        "/update-lineup-event",
        {
          pool_name: poolInfo.name,
          participant_id: participantId,
          from_date: fromDate,
          // Absent drops the event; the backend reads the two cases apart on
          // exactly this.
          ...(toDate === null ? {} : { to_date: toDate }),
        },
        userSession.info?.jwt,
      );

      if (!res.ok) {
        toast.error(failure(res.error), { duration: 5000 });
        return false;
      }

      updatePoolInfo(res.data);
      toast.success(success(), { duration: 3000 });
      return true;
    } finally {
      setPendingEvent(null);
    }
  };

  const reDate = (participantId: string, fromDate: string, toDate: string) =>
    file(
      participantId,
      fromDate,
      toDate,
      (error) =>
        t("CouldNotMoveLineupEvent", {
          userName: nameOf(participantId),
          fromDate,
          toDate,
          error,
        }),
      () =>
        t("SuccessMoveLineupEvent", {
          userName: nameOf(participantId),
          fromDate,
          toDate,
        }),
    );

  const drop = (participantId: string, fromDate: string) =>
    file(
      participantId,
      fromDate,
      null,
      (error) =>
        t("CouldNotDropLineupEvent", {
          userName: nameOf(participantId),
          fromDate,
          error,
        }),
      () =>
        t("SuccessDropLineupEvent", {
          userName: nameOf(participantId),
          fromDate,
        }),
    );

  return { canEdit, backdateRange, pendingEvent, reDate, drop };
}
