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
import { PendingPoolerLink, Pool, PoolUser } from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";

// Mirrors MAX_EMAIL_LENGTH in the backend, which rejects anything longer.
const MAX_EMAIL_LENGTH = 254;

interface Props {
  poolName: string;

  // The pooler being handed over. It keeps its name, its players and its
  // points: only the account behind it changes.
  pooler: PoolUser;

  // The invitation already standing on this pooler, if any. When there is one
  // the dialog withdraws it instead of filing another.
  pendingLink: PendingPoolerLink | null;

  trigger: React.ReactElement;

  // Called with the pool the backend returned once the invitation was filed or
  // withdrawn.
  onUpdated?: (pool: Pool) => void;
}

/*
Hands one of the poolers of a pool over to another account.

A pooler the owner typed into the draft room has no account behind it, and a
pooler who registered with one address may want to play from another. Both are
the same move: the pooler keeps its name, its roster, its trades and its points,
and only the account it answers to changes.

The owner cannot do that alone. Identity lives in Hanko and the app keeps no
user directory, so an address cannot be resolved to an account here — and taking
somebody's roster over should be their call anyway. So this only files an
invitation; it is the person signing in with that address who turns it into the
link, from the pool page.

Nothing is emailed. The owner already has a way to reach the pooler they are
inviting, and the pool page is a link away.
*/
export default function LinkPoolerAccountDialog({
  poolName,
  pooler,
  pendingLink,
  trigger,
  onUpdated,
}: Props) {
  const t = useTranslations();
  const userSession = useSession();

  // The settings render one dialog per pooler, a fixed id would repeat across
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

  const submit = async (path: string, body: Record<string, string>) => {
    setIsSubmitting(true);
    const res = await apiPost<Pool>(path, body, userSession.info?.jwt);
    setIsSubmitting(false);
    return res;
  };

  const onInvite = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canInvite || isSubmitting) {
      return;
    }

    const res = await submit("/request-pooler-link", {
      pool_name: poolName,
      pooler_user_id: pooler.id,
      email: trimmedEmail,
    });

    if (!res.ok) {
      // The dialog stays open so the invitation can be retried without typing
      // the address again.
      toast.error(
        t("CouldNotRequestPoolerLinkError", {
          name: pooler.name,
          error: res.error,
        }),
        { duration: 5000 },
      );
      return;
    }

    setOpen(false);
    toast.success(t("SuccessRequestPoolerLink", { name: pooler.name }), {
      duration: 4000,
    });
    onUpdated?.(res.data);
  };

  const onCancelInvitation = async () => {
    if (isSubmitting) {
      return;
    }

    const res = await submit("/cancel-pooler-link", {
      pool_name: poolName,
      pooler_user_id: pooler.id,
    });

    if (!res.ok) {
      toast.error(
        t("CouldNotCancelPoolerLinkError", {
          name: pooler.name,
          error: res.error,
        }),
        { duration: 5000 },
      );
      return;
    }

    setOpen(false);
    toast.success(t("SuccessCancelPoolerLink", { name: pooler.name }), {
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
                {t("PendingPoolerLinkTitle", { name: pooler.name })}
              </DialogTitle>
              <DialogDescription>
                {t("PendingPoolerLinkDescription", {
                  email: pendingLink.email_hint,
                  name: pooler.name,
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
                onClick={onCancelInvitation}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : null}
                {t("CancelPoolerLink")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onInvite} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>
                {t("LinkPoolerAccountTitle", { name: pooler.name })}
              </DialogTitle>
              <DialogDescription>
                {t("LinkPoolerAccountDescription", { name: pooler.name })}
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
                placeholder="pooler@example.com"
                autoComplete="off"
                maxLength={MAX_EMAIL_LENGTH}
                disabled={isSubmitting}
              />
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {t("LinkPoolerAccountHint")}
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
