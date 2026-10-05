"use client";

import { useTranslations } from "next-intl";

import EffectiveDatePicker from "@/components/effective-date-picker";
import PlayerSearchDialog from "@/components/search-players";
import { usePoolContext } from "@/context/pool-context";
import { WaiverClaim } from "@/hooks/use-waiver-claim";

/*
The free agent search a waiver claim is completed from.

Mounted once per screen rather than per row: only one claim is ever in flight,
and `playerToDrop` is what opens it.
*/
export default function WaiverClaimDialog({ claim }: { claim: WaiverClaim }) {
  const t = useTranslations();
  const { poolInfo } = usePoolContext();

  return (
    <PlayerSearchDialog
      label={
        claim.playerToDrop
          ? t("PickReplacementFor", { playerName: claim.playerToDrop.name })
          : t("PickReplacement")
      }
      currentSeason={poolInfo.season}
      open={claim.playerToDrop !== null}
      onOpenChange={(open) => {
        if (!open) claim.setPlayerToDrop(null);
      }}
      unavailableReason={claim.replacementUnavailableReason}
      onPlayerSelect={claim.claim}
      // Picking a result files the claim, so the day it counts from has to be
      // settled before the search rather than after it.
      beforeSearch={
        claim.canBackdate ? (
          <EffectiveDatePicker
            range={claim.backdateRange}
            value={claim.effectiveDate}
            onChange={claim.setEffectiveDate}
            disabled={claim.isClaiming}
          />
        ) : null
      }
    />
  );
}
