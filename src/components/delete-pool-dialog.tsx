"use client";

import * as React from "react";
import { LoaderCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
import { useSession } from "@/context/useSessionData";
import { Pool } from "@/data/pool/model";
import { useFavoritePools } from "@/hooks/use-favorite-pools";
import { apiPost } from "@/lib/client-api";

interface Props {
  poolName: string;

  // Opens the dialog. The caller owns it entirely so the same dialog can hang
  // off an icon button in the pool list and off a full button in the settings.
  trigger: React.ReactElement;

  // Called with the deleted pool once the backend confirmed the deletion. The
  // pool page has to navigate away, the pool list only drops a card, so what
  // happens next is left to the caller.
  onDeleted?: (pool: Pool) => void;
}

/*
Deletes a pool, behind a confirmation that asks for its name.

The backend only lets the owner of the pool delete it, and the deletion takes
every roster, trade and score down with it, so the name has to be typed back
before the button unlocks. Callers still hide the trigger from everyone but the
owner: the check here is a guard, not the permission.
*/
export default function DeletePoolDialog({
  poolName,
  trigger,
  onDeleted,
}: Props) {
  const t = useTranslations();
  const userSession = useSession();
  const { isFavorite, toggleFavorite } = useFavoritePools();

  // The pool list renders one dialog per owned pool, a fixed id would repeat
  // across them.
  const confirmationId = React.useId();

  const [open, setOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  const confirmed = confirmation.trim() === poolName;

  const onDelete = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!confirmed || isDeleting) {
      return;
    }

    setIsDeleting(true);
    const res = await apiPost<Pool>(
      "/delete-pool",
      { pool_name: poolName },
      userSession.info?.jwt,
    );
    setIsDeleting(false);

    if (!res.ok) {
      // The dialog stays open so the deletion can be retried without typing
      // the name again.
      toast.error(
        t("CouldNotDeletePoolError", { name: poolName, error: res.error }),
        { duration: 5000 },
      );
      return;
    }

    // The pool is gone, its favorite entry would only leave a dead shortcut in
    // the sidebar.
    if (isFavorite(poolName)) {
      toggleFavorite(poolName);
    }

    setOpen(false);
    toast.success(t("SuccessDeletePool", { name: poolName }), {
      duration: 2000,
    });
    onDeleted?.(res.data);
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
        <form onSubmit={onDelete} className="flex flex-col gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("DeletePoolConfirmationTitle", { name: poolName })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("DeletePoolConfirmationDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-2 text-left">
            <Label htmlFor={confirmationId} className="font-normal">
              {t("DeletePoolConfirmationPrompt", { name: poolName })}
            </Label>
            <Input
              id={confirmationId}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={poolName}
              autoComplete="off"
              // The name is what guards the deletion, filling it in for the
              // user would defeat the confirmation.
              data-1p-ignore
              disabled={isDeleting}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("Cancel")}
            </AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={!confirmed || isDeleting}
            >
              {isDeleting ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              {t("Delete")}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
