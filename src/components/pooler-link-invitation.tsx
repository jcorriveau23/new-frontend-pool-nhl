"use client";

import * as React from "react";
import { LinkIcon, LoaderCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { usePoolContext } from "@/context/pool-context";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";
import { Pool } from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";
import { hashEmail } from "@/lib/email-hash";
import { db } from "@/db";

/*
The invitation banner the person being handed a pooler sees on the pool page.

The pool owner cannot link an account on their own: the app has no user
directory, so an address cannot be resolved to an account, and taking a roster
over is the taker's call. The owner files an invitation against an address and
the person signing in with it accepts it here — at which point the pooler's id
becomes their account, and its roster, trades, picks and points come with it.

An invitation names an address, but the pool never carries one: it is readable
by anybody who can read the pool. It carries the hash of the address instead, so
recognizing an invitation as yours means hashing the address you signed in with
and comparing. Everybody else sees no banner at all, which is the point.

The acceptance itself is not decided here. The backend matches the invitation
against the address Hanko put in the JWT, so this only ever shows what the
backend would agree to.
*/
export default function PoolerLinkInvitation() {
  const t = useTranslations();
  const { poolInfo, updatePoolInfo } = usePoolContext();
  const userSession = useSession();
  const userData = useUser();

  const [emailHash, setEmailHash] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const userEmail = userData.info?.email;

  React.useEffect(() => {
    if (!userEmail) {
      setEmailHash(null);
      return;
    }

    // Guards against a slow digest resolving after the signed in user changed,
    // which would show one user's invitation to the next.
    let isCurrent = true;
    hashEmail(userEmail).then((hash) => {
      if (isCurrent) {
        setEmailHash(hash);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [userEmail]);

  const invitation = React.useMemo(() => {
    if (emailHash === null) {
      return null;
    }

    return (
      poolInfo.pending_pooler_links?.find(
        (pending) => pending.email_hash === emailHash
      ) ?? null
    );
  }, [poolInfo.pending_pooler_links, emailHash]);

  const pooler = React.useMemo(
    () =>
      poolInfo.participants.find(
        (participant) => participant.id === invitation?.pooler_user_id
      ) ?? null,
    [poolInfo.participants, invitation]
  );

  // An invitation on a pooler that is no longer in the pool is not something
  // the taker can act on, and the backend would refuse it anyway.
  if (invitation === null || pooler === null) {
    return null;
  }

  const respond = async (
    path: string,
    errorKey: string,
    successKey: string,
    // Accepting rewrites the pooler's id; declining leaves the pool as it is.
    movesTheParticipantId: boolean
  ) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const res = await apiPost<Pool>(
      path,
      { pool_name: poolInfo.name, pooler_user_id: pooler.id },
      userSession.info?.jwt
    );

    if (!res.ok) {
      setIsSubmitting(false);
      toast.error(t(errorKey, { name: pooler.name, error: res.error }), {
        duration: 5000,
      });
      return;
    }

    if (movesTheParticipantId) {
      // The locally cached days are keyed by the pooler id they were derived
      // under, and only the days missing from that cache are ever re-fetched —
      // so a cache kept across the rename would answer for the old id forever,
      // and the pooler would read as scoreless for everything before today.
      // The scores themselves are derived from the lineup events, which moved
      // with the pooler, so dropping the cache is all it takes to get them back.
      try {
        // @ts-expect-error, dexie is not typed.
        await db.pools.where("name").equals(poolInfo.name).delete();
      } catch (error) {
        // Worth reporting, not worth blocking on: the reload below refetches
        // the pool either way, and a stale cache costs points on a chart, not
        // the link that was just made.
        console.error(`could not drop the cached pool: ${error}`);
      }

      toast.success(t(successKey, { name: pooler.name }), { duration: 4000 });
      // Who the reader is in this pool just changed, and that reaches further
      // than the pool object: the rosters they may edit, the trades addressed
      // to them, the row marked as theirs. Reloading is the honest way to
      // rebuild all of it, and this happens once in a pooler's life.
      window.location.reload();
      return;
    }

    setIsSubmitting(false);
    toast.success(t(successKey, { name: pooler.name }), { duration: 4000 });
    updatePoolInfo(res.data);
  };

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2 text-sm">
        <LinkIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>{t("PoolerLinkInvitationDescription", { name: pooler.name })}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isSubmitting}
          onClick={() =>
            respond(
              "/decline-pooler-link",
              "CouldNotDeclinePoolerLinkError",
              "SuccessDeclinePoolerLink",
              false
            )
          }
        >
          {t("DeclinePoolerLink")}
        </Button>
        <Button
          size="sm"
          disabled={isSubmitting}
          onClick={() =>
            respond(
              "/accept-pooler-link",
              "CouldNotAcceptPoolerLinkError",
              "SuccessAcceptPoolerLink",
              true
            )
          }
        >
          {isSubmitting ? <LoaderCircleIcon className="animate-spin" /> : null}
          {t("AcceptPoolerLink")}
        </Button>
      </div>
    </div>
  );
}
