"use client";

import * as React from "react";

import { PoolerNameText } from "@/components/pooler-name";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

/*
The owner's list of the people in a pool, shared by the two pool types.

Both pools give their owner the same two calls on a participant — rename them,
or hand their spot to an account — and both used to draw the row their own way:
the survivor pool as a bordered list of names, badges and labelled buttons, the
roster pool as a bare list with two unlabelled icon buttons. They are one
component now, so the screen the owner learns on one pool is the screen they
get on the other.

What stays with the callers is the pair of dialogs, since those speak to
different endpoints: the row takes them as children and only places them. The
trigger buttons go in `children` too, which is also what keeps the row empty of
them for anybody who may not use them.
*/

export function ParticipantAdminList({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ul className="divide-y rounded-md border">{children}</ul>;
}

// Enough of a pending account link to say one is standing. Both pool types have
// an invitation shaped this way, and the row needs nothing else from it.
interface PendingLinkHint {
  email_hint?: string | null;
}

interface ParticipantAdminRowProps {
  name: string;

  /*
  Whether an account answers for this participant, or the organiser keeps the
  spot on their behalf.

  The badge it drives is the one thing about a row that is not obvious from the
  name, and it is what says whose picks and lineups the organiser has to file
  themselves — so it is also the row where linking an account means something.
  */
  isOwned: boolean;

  // The invitation already standing on this participant, if any.
  pendingLink?: PendingLinkHint | null;

  // The owner's controls for this row, pushed to its end.
  children?: React.ReactNode;
}

export function ParticipantAdminRow({
  name,
  isOwned,
  pendingLink = null,
  children,
}: ParticipantAdminRowProps) {
  const t = useTranslations();

  return (
    <li className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {/* Nothing stops somebody from registering with an email address, so
        the name is cut the same way it is in every ranking rather than pushing
        the badges off the row. On a phone it may have the whole width, where a
        laptop keeps it to the width of a ranking's column. */}
        <PoolerNameText
          name={name}
          className="max-w-full font-medium sm:max-w-[200px]"
        />

        {isOwned ? (
          <Badge variant="outline">{t("ParticipantHasAccount")}</Badge>
        ) : (
          <Badge variant="secondary">{t("ParticipantOrganiserRun")}</Badge>
        )}

        {pendingLink ? (
          <Badge variant="outline" className="max-w-full">
            <span className="truncate">
              {t("ParticipantLinkPending", {
                // The hint is redacted server-side; "***" covers a backend that
                // answered without one, since this is only ever read by the
                // owner to recognise what they filed.
                email: pendingLink.email_hint ?? "***",
              })}
            </span>
          </Badge>
        ) : null}
      </div>

      {children ? (
        // The negative margin pulls the first button's own padding back so its
        // icon lines up with the name above it; from `sm` up the actions go to
        // the end of the row instead.
        <div className="-ml-2 flex flex-wrap items-center gap-1 sm:ml-auto">
          {children}
        </div>
      ) : null}
    </li>
  );
}
