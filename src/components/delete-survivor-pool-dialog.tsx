"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import ConfirmByNameDialog from "@/components/confirm-by-name-dialog";
import { useSession } from "@/context/useSessionData";
import { deleteSurvivorPool } from "@/lib/survivor-api";

interface Props {
  poolName: string;
  trigger: React.ReactElement;
  onDeleted?: () => void;
}

/*
Deletes a survivor pool, behind the same confirmation the roster pool uses.

Worth the same gate for a different reason. A survivor pool is the one built
for hundreds of people, its picks are their own documents and the deletion
takes every one of them with it, and none of it is recoverable — so an
owner's misplaced click should not be enough.

The backend lets only the owner delete, so callers hide the trigger from
everyone else; this is a guard, not the permission.
*/
export default function DeleteSurvivorPoolDialog({
  poolName,
  trigger,
  onDeleted,
}: Props) {
  const t = useTranslations();
  const userSession = useSession();

  const onConfirm = async () => {
    const res = await deleteSurvivorPool(poolName, userSession.info?.jwt);

    if (!res.ok) {
      toast.error(
        t("CouldNotDeletePoolError", { name: poolName, error: res.error }),
        { duration: 5000 },
      );
      return false;
    }

    toast.success(t("SuccessDeletePool", { name: poolName }), {
      duration: 2000,
    });
    onDeleted?.();
    return true;
  };

  return (
    <ConfirmByNameDialog
      name={poolName}
      title={t("DeletePoolConfirmationTitle", { name: poolName })}
      description={t("DeleteSurvivorPoolConfirmationDescription")}
      prompt={t("DeletePoolConfirmationPrompt", { name: poolName })}
      trigger={trigger}
      onConfirm={onConfirm}
    />
  );
}
