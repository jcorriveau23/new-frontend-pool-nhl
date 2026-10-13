"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import ConfirmByNameDialog from "@/components/confirm-by-name-dialog";
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
Deletes a roster pool, behind a confirmation that asks for its name.

The backend only lets the owner of the pool delete it, and the deletion takes
every roster, trade and score down with it, so the name has to be typed back
before the button unlocks. Callers still hide the trigger from everyone but the
owner: the check here is a guard, not the permission.

The gate itself is [`ConfirmByNameDialog`], shared with the survivor pool.
*/
export default function DeletePoolDialog({
  poolName,
  trigger,
  onDeleted,
}: Props) {
  const t = useTranslations();
  const userSession = useSession();
  const { isFavorite, toggleFavorite } = useFavoritePools();

  const onConfirm = async () => {
    const res = await apiPost<Pool>(
      "/delete-pool",
      { pool_name: poolName },
      userSession.info?.jwt,
    );

    if (!res.ok) {
      toast.error(
        t("CouldNotDeletePoolError", { name: poolName, error: res.error }),
        { duration: 5000 },
      );
      return false;
    }

    // The pool is gone, its favorite entry would only leave a dead shortcut in
    // the sidebar.
    if (isFavorite("pool", poolName)) {
      toggleFavorite("pool", poolName);
    }

    toast.success(t("SuccessDeletePool", { name: poolName }), {
      duration: 2000,
    });
    onDeleted?.(res.data);
    return true;
  };

  return (
    <ConfirmByNameDialog
      name={poolName}
      title={t("DeletePoolConfirmationTitle", { name: poolName })}
      description={t("DeletePoolConfirmationDescription")}
      prompt={t("DeletePoolConfirmationPrompt", { name: poolName })}
      trigger={trigger}
      onConfirm={onConfirm}
    />
  );
}
