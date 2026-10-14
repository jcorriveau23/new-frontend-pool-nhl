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
import { SurvivorPool, SurvivorUser } from "@/data/survivor/model";
import { renameSurvivorParticipant } from "@/lib/survivor-api";

// Mirrors MAX_PARTICIPANT_NAME_LENGTH in the backend, which rejects anything
// longer. Checked here too so an over-long name is caught before the round trip.
const MAX_PARTICIPANT_NAME_LENGTH = 32;

interface Props {
  poolName: string;

  // The participant being renamed. Only their display name changes: their id is
  // what their picks, their strikes and the standings row are keyed by.
  participant: SurvivorUser;

  // Everybody in the pool, to refuse a name somebody else already goes by
  // before asking the backend for it.
  participants: SurvivorUser[];

  // Opens the dialog, owned by the caller so the same dialog can hang off a row
  // button or a menu entry.
  trigger: React.ReactElement;

  onUpdated?: (pool: SurvivorPool) => void;
}

/*
Renames one of a survivor pool's participants.

The counterpart of `rename-pooler-dialog.tsx`, for the same two cases: a spot
the organiser typed in under a placeholder, and somebody who signed themselves
up and is displayed as the address they registered with. Only the display name
moves — the id stays, and with it every pick already filed under it, the strikes
counted against it and any invitation standing on it.

Renaming is the owner's alone, which is the rule the backend applies; the
trigger is hidden from everybody else as a guard, not as the permission.
*/
export default function RenameSurvivorParticipantDialog({
  poolName,
  participant,
  participants,
  trigger,
  onUpdated,
}: Props) {
  const t = useTranslations();
  const userSession = useSession();

  // The list renders one dialog per participant, a fixed id would repeat across
  // them.
  const nameId = React.useId();

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(participant.name);
  const [isRenaming, setIsRenaming] = React.useState(false);

  const trimmedName = name.trim();

  // The name is only judged once it has been typed: an empty field is where a
  // rename starts, not a mistake worth flagging.
  const error =
    trimmedName.length === 0
      ? null
      : trimmedName.length > MAX_PARTICIPANT_NAME_LENGTH
        ? t("SurvivorParticipantNameTooLongError", {
            max: MAX_PARTICIPANT_NAME_LENGTH,
          })
        : participants.some(
              (candidate) =>
                candidate.id !== participant.id &&
                candidate.name === trimmedName,
            )
          ? t("SurvivorParticipantNameTakenError", { name: trimmedName })
          : null;

  const canRename =
    error === null &&
    trimmedName.length > 0 &&
    trimmedName !== participant.name;

  const onRename = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canRename || isRenaming) {
      return;
    }

    setIsRenaming(true);
    const res = await renameSurvivorParticipant(
      poolName,
      participant.id,
      trimmedName,
      userSession.info?.jwt,
    );
    setIsRenaming(false);

    if (!res.ok) {
      // The dialog stays open so the rename can be retried without typing the
      // name again.
      toast.error(
        t("CouldNotRenameSurvivorParticipantError", {
          name: participant.name,
          error: res.error,
        }),
        { duration: 5000 },
      );
      return;
    }

    setOpen(false);
    toast.success(
      t("SuccessRenameSurvivorParticipant", {
        name: participant.name,
        newName: trimmedName,
      }),
      { duration: 2000 },
    );
    onUpdated?.(res.data);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // A dialog reopened after a failed attempt, or after the participant was
        // renamed from somewhere else, starts from the name they carry now.
        setName(participant.name);
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={onRename} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {t("RenameSurvivorParticipantTitle", { name: participant.name })}
            </DialogTitle>
            <DialogDescription>
              {t("RenameSurvivorParticipantDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 text-left">
            <Label htmlFor={nameId} className="font-normal">
              {t("SurvivorParticipantName")}
            </Label>
            <Input
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={participant.name}
              autoComplete="off"
              maxLength={MAX_PARTICIPANT_NAME_LENGTH}
              disabled={isRenaming}
            />
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isRenaming}
            >
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!canRename || isRenaming}>
              {isRenaming ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              {t("Rename")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
