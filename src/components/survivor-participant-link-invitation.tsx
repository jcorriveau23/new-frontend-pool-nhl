"use client";

import * as React from "react";
import { LinkIcon, LoaderCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";
import { SurvivorPool } from "@/data/survivor/model";
import { hashEmail } from "@/lib/email-hash";
import {
  acceptSurvivorParticipantLink,
  declineSurvivorParticipantLink,
} from "@/lib/survivor-api";

/*
The invitation banner the person being handed a spot sees on the survivor pool
page.

The counterpart of `pooler-link-invitation.tsx`, and the same shape for the same
reasons. A spot the organiser entered by hand has no account behind it, so the
person it stands for cannot pick for themselves — the organiser files their
picks. This is what moves the spot onto their account, and it is their call
rather than the organiser's: the app has no user directory, so an address cannot
be resolved to an account, and taking a spot over should be agreed to.

An invitation names an address, but the pool never carries one — it is readable
by anybody who can read the pool. It carries the hash of the address instead, so
recognising an invitation as yours means hashing the address you signed in with
and comparing. Everybody else sees no banner at all, which is the point.

The acceptance itself is not decided here. The backend matches the invitation
against the address Hanko put in the JWT, so this only ever shows what the
backend would agree to.
*/
export default function SurvivorParticipantLinkInvitation({
  pool,
  onPoolChange,
}: {
  pool: SurvivorPool;
  onPoolChange: (pool: SurvivorPool) => void;
}) {
  const t = useTranslations();
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
      pool.pending_participant_links?.find(
        (pending) => pending.email_hash === emailHash,
      ) ?? null
    );
  }, [pool.pending_participant_links, emailHash]);

  const spot = React.useMemo(
    () =>
      pool.participants.find(
        (participant) => participant.id === invitation?.participant_id,
      ) ?? null,
    [pool.participants, invitation],
  );

  // An invitation on a spot that is no longer in the pool is not something the
  // taker can act on, and the backend would refuse it anyway.
  if (invitation === null || spot === null) {
    return null;
  }

  const accept = async () => {
    setIsSubmitting(true);
    const res = await acceptSurvivorParticipantLink(
      pool.name,
      spot.id,
      userSession.info?.jwt,
    );

    if (!res.ok) {
      setIsSubmitting(false);
      toast.error(
        t("CouldNotAcceptSurvivorLinkError", {
          name: spot.name,
          error: res.error,
        }),
        { duration: 5000 },
      );
      return;
    }

    toast.success(t("SuccessAcceptSurvivorLink", { name: spot.name }), {
      duration: 4000,
    });
    /*
    Who the reader is in this pool just changed, and that reaches further than
    the pool object: the spot the pick screen files for, whether the join card
    shows, which row of the standings is theirs. Reloading is the honest way to
    rebuild all of it, and this happens once in a spot's life — the same call
    the roster pool's invitation makes.
    */
    window.location.reload();
  };

  const decline = async () => {
    setIsSubmitting(true);
    const res = await declineSurvivorParticipantLink(
      pool.name,
      spot.id,
      userSession.info?.jwt,
    );
    setIsSubmitting(false);

    if (!res.ok) {
      toast.error(
        t("CouldNotDeclineSurvivorLinkError", {
          name: spot.name,
          error: res.error,
        }),
        { duration: 5000 },
      );
      return;
    }

    toast.success(t("SuccessDeclineSurvivorLink", { name: spot.name }), {
      duration: 4000,
    });
    onPoolChange(res.data);
  };

  return (
    <div className="border-primary/40 bg-primary/5 mb-4 flex flex-col gap-3 rounded-lg border px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2 text-sm">
        <LinkIcon className="text-primary mt-0.5 size-4 shrink-0" />
        <p>
          {t("SurvivorLinkInvitationDescription", {
            name: spot.name,
            pool: pool.name,
          })}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isSubmitting}
          onClick={() => void decline()}
        >
          {t("DeclineSurvivorLink")}
        </Button>
        <Button size="sm" disabled={isSubmitting} onClick={() => void accept()}>
          {isSubmitting ? <LoaderCircleIcon className="animate-spin" /> : null}
          {t("AcceptSurvivorLink")}
        </Button>
      </div>
    </div>
  );
}
