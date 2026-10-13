"use client";

import * as React from "react";
import { LoaderCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/context/useSessionData";
import {
  PendingParticipantLink,
  SurvivorPool,
  SurvivorUser,
} from "@/data/survivor/model";
import {
  cancelSurvivorParticipantLink,
  requestSurvivorParticipantLink,
} from "@/lib/survivor-api";

// Mirrors MAX_EMAIL_LENGTH in the backend, which rejects anything longer.
const MAX_EMAIL_LENGTH = 254;

interface Props {
  poolName: string;

  // The spot being handed over. It keeps its name, its strikes and its picks:
  // only the account behind it changes.
  participant: SurvivorUser;

  // The invitation already standing on this spot, if any. When there is one the
  // dialog withdraws it instead of filing another.
  pendingLink: PendingParticipantLink | null;

  trigger: React.ReactElement;

  onUpdated?: (pool: SurvivorPool) => void;
}

/*
Hands one of a survivor pool's spots over to an account.

The counterpart of `link-pooler-account-dialog.tsx`. A spot the organiser typed
into the participants list has no account behind it, so that person cannot pick
for themselves — the organiser files their picks from the pick screen. This is
what lets them take it over: the spot keeps its name, its strikes and every pick
already filed for it, and only the account it answers to changes.

The owner cannot do that alone. Identity lives in Hanko and the app keeps no
user directory, so an address cannot be resolved to an account here — and taking
somebody's spot over should be their call anyway. So this only files an
invitation; it is the person signing in with that address who turns it into the
link, from the pool page.

Nothing is emailed. The owner already has a way to reach the person they are
inviting, and the pool page is a link away.
*/
export default function LinkSurvivorParticipantDialog({
  poolName,
  participant,
  pendingLink,
  trigger,
  onUpdated,
}: Props) {
  const t = useTranslations();
  const userSession = useSession();

  // The list renders one dialog per participant, a fixed id would repeat across
  // them.
  const emailId = React.useId();

  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const trimmedEmail = email.trim();

  // The address is only judged once it has been typed: an empty field is where
  // the invitation starts, not a mistake worth flagging. The check is the same
  // shallow one the backend makes — the address is never sent anything, it is
  // only ever compared against the one Hanko verified, so this is here to catch
  // a typo, not to validate an address.
  const error =
    trimmedEmail.length === 0
      ? null
      : trimmedEmail.length > MAX_EMAIL_LENGTH
        ? t("PoolerLinkEmailTooLongError", { max: MAX_EMAIL_LENGTH })
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
          ? null
          : t("PoolerLinkEmailInvalidError");

  const canInvite = error === null && trimmedEmail.length > 0;

  const onInvite = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canInvite || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const res = await requestSurvivorParticipantLink(
      poolName,
      participant.id,
      trimmedEmail,
      userSession.info?.jwt,
    );
    setIsSubmitting(false);

    if (!res.ok) {
      // The dialog stays open so the invitation can be retried without typing
      // the address again.
      toast.error(
        t("CouldNotRequestSurvivorLinkError", {
          name: participant.name,
          error: res.error,
        }),
        { duration: 5000 },
      );
      return;
    }

    setOpen(false);
    toast.success(t("SuccessRequestSurvivorLink", { name: participant.name }), {
      duration: 4000,
    });
    onUpdated?.(res.data);
  };

  const onCancelInvitation = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const res = await cancelSurvivorParticipantLink(
      poolName,
      participant.id,
      userSession.info?.jwt,
    );
    setIsSubmitting(false);

    if (!res.ok) {
      toast.error(
        t("CouldNotCancelSurvivorLinkError", {
          name: participant.name,
          error: res.error,
        }),
        { duration: 5000 },
      );
      return;
    }

    setOpen(false);
    toast.success(t("SuccessCancelSurvivorLink", { name: participant.name }), {
      duration: 2000,
    });
    onUpdated?.(res.data);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // A dialog reopened after a failed attempt starts from an empty field
        // rather than from the address that did not work.
        setEmail("");
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[425px]">
        {pendingLink ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>
                {t("PendingSurvivorLinkTitle", { name: participant.name })}
              </DialogTitle>
              <DialogDescription>
                {t("PendingSurvivorLinkDescription", {
                  email: pendingLink.email_hint ?? "***",
                  name: participant.name,
                })}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                {t("Close")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void onCancelInvitation()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : null}
                {t("CancelSurvivorLink")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onInvite} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>
                {t("LinkSurvivorParticipantTitle", { name: participant.name })}
              </DialogTitle>
              <DialogDescription>
                {t("LinkSurvivorParticipantDescription", {
                  name: participant.name,
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2 text-left">
              <Label htmlFor={emailId} className="font-normal">
                {t("PoolerLinkEmail")}
              </Label>
              <Input
                id={emailId}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="participant@example.com"
                autoComplete="off"
                maxLength={MAX_EMAIL_LENGTH}
                disabled={isSubmitting}
              />
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : null}
              <p className="text-muted-foreground text-sm">
                {t("LinkSurvivorParticipantHint")}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={!canInvite || isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : null}
                {t("SendPoolerLink")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
