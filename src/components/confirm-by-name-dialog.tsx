"use client";

/*
A destructive action behind typing the thing's name back.

Written once and shared because the two pool types delete the same way, and a
second hand-rolled copy of this gate is how one of them ends up a click away
from erasing a pool. What is destroyed differs — a roster pool takes its
rosters, trades and scores down with it, a survivor pool its picks — so the
wording and the request itself are the caller's; the gate is not.

The caller returns whether the action went through. A refusal leaves the dialog
open with the name still typed, so it can be retried without filling the field
in again.
*/

import * as React from "react";
import { LoaderCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  // What has to be typed back before the button unlocks.
  name: string;

  title: string;
  description: string;
  // Asks for the name. The caller passes it already interpolated.
  prompt: string;
  confirmLabel?: string;

  // Opens the dialog. The caller owns it entirely so the same dialog can hang
  // off an icon button in a pool list and off a full button in the settings.
  trigger: React.ReactElement;

  // Runs the action. True once it went through, which closes the dialog.
  onConfirm: () => Promise<boolean>;
}

export default function ConfirmByNameDialog({
  name,
  title,
  description,
  prompt,
  confirmLabel,
  trigger,
  onConfirm,
}: Props) {
  const t = useTranslations();

  // A list renders one of these per row; a fixed id would repeat across them.
  const confirmationId = React.useId();

  const [open, setOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const [isWorking, setIsWorking] = React.useState(false);

  const confirmed = confirmation.trim() === name;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!confirmed || isWorking) {
      return;
    }

    setIsWorking(true);
    const done = await onConfirm();
    setIsWorking(false);

    if (done) {
      setOpen(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        // A dialog reopened after a failed attempt starts from a blank field.
        setConfirmation("");
        setOpen(nextOpen);
      }}
    >
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-2 text-left">
            <Label htmlFor={confirmationId} className="font-normal">
              {prompt}
            </Label>
            <Input
              id={confirmationId}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={name}
              autoComplete="off"
              // The name is what guards the action, filling it in for the user
              // would defeat the confirmation.
              data-1p-ignore
              disabled={isWorking}
            />
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isWorking}>
              {t("Cancel")}
            </AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={!confirmed || isWorking}
            >
              {isWorking ? <LoaderCircleIcon className="animate-spin" /> : null}
              {confirmLabel ?? t("Delete")}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
