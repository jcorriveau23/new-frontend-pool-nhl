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
import { Pool, PoolUser } from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";

// Mirrors MAX_POOLER_NAME_LENGTH in the backend, which rejects anything longer.
// Checked here too so an over-long name is caught before the round trip.
const MAX_POOLER_NAME_LENGTH = 32;

interface Props {
  poolName: string;

  // The pooler being renamed. Only its display name changes, its id is what
  // the rosters, the trades and the scores are keyed by.
  pooler: PoolUser;

  // Everyone in the pool, to refuse a name another pooler already carries
  // before asking the backend for it.
  participants: PoolUser[];

  // Opens the dialog, owned by the caller so the same dialog can hang off a
  // row button or a menu entry.
  trigger: React.ReactElement;

  // Called with the pool the backend returned once the rename went through.
  onRenamed?: (pool: Pool) => void;
}

/*
Renames one of the poolers of a pool.

Poolers registering with an email address end up displayed as that address in
every ranking of the pool, so the owner is given a way to replace it by the
name everyone actually uses. Only the display name moves: the pooler keeps its
user id, and with it its roster, its trades and its scores.

The backend only lets the owner of the pool rename a pooler. Callers still hide
the trigger from everyone else: the check there is a guard, not the permission.
*/
export default function RenamePoolerDialog({
  poolName,
  pooler,
  participants,
  trigger,
  onRenamed,
}: Props) {
  const t = useTranslations();
  const userSession = useSession();

  // The settings render one dialog per pooler, a fixed id would repeat across
  // them.
  const nameId = React.useId();

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(pooler.name);
  const [isRenaming, setIsRenaming] = React.useState(false);

  const trimmedName = name.trim();

  // The name is only rejected once it has been typed: an empty field is the
  // starting point of a rename, not a mistake worth flagging.
  const error =
    trimmedName.length === 0
      ? null
      : trimmedName.length > MAX_POOLER_NAME_LENGTH
      ? t("PoolerNameTooLongError", { max: MAX_POOLER_NAME_LENGTH })
      : participants.some(
          (participant) =>
            participant.id !== pooler.id && participant.name === trimmedName
        )
      ? t("PoolerNameAlreadyTakenError", { name: trimmedName })
      : null;

  const canRename =
    error === null && trimmedName.length > 0 && trimmedName !== pooler.name;

  const onRename = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canRename || isRenaming) {
      return;
    }

    setIsRenaming(true);
    const res = await apiPost<Pool>(
      "/update-pooler-name",
      {
        pool_name: poolName,
        pooler_user_id: pooler.id,
        new_name: trimmedName,
      },
      userSession.info?.jwt
    );
    setIsRenaming(false);

    if (!res.ok) {
      // The dialog stays open so the rename can be retried without typing the
      // name again.
      toast.error(
        t("CouldNotRenamePoolerError", {
          name: pooler.name,
          error: res.error,
        }),
        { duration: 5000 }
      );
      return;
    }

    setOpen(false);
    toast.success(
      t("SuccessRenamePooler", { name: pooler.name, newName: trimmedName }),
      { duration: 2000 }
    );
    onRenamed?.(res.data);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // A dialog reopened after a failed attempt, or after the pooler was
        // renamed from somewhere else, starts from the name it carries now.
        setName(pooler.name);
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={onRename} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {t("RenamePoolerTitle", { name: pooler.name })}
            </DialogTitle>
            <DialogDescription>
              {t("RenamePoolerDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 text-left">
            <Label htmlFor={nameId} className="font-normal">
              {t("PoolerName")}
            </Label>
            <Input
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={pooler.name}
              autoComplete="off"
              maxLength={MAX_POOLER_NAME_LENGTH}
              disabled={isRenaming}
            />
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>

          <DialogFooter>
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
