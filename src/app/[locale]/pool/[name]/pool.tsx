// The pools page, list all the pools stored in the db.

"use client";
import * as React from "react";
import { PoolState } from "@/data/pool/model";
import InProgressPool from "./in-progress/in-progress-pool";
import CreatedPool from "./created/created-pool";
import DynastyPool from "./dynasty/dynasty-pool";
import DraftPool from "./draft/draft-pool";
import { SocketProvider } from "@/context/socket-context";
import { usePoolContext } from "@/context/pool-context";
import { useTranslations } from "next-intl";
import PageTitle from "@/components/page-title";
import FavoritePoolButton from "@/components/favorite-pool-button";
import SharePoolButton from "@/components/share-pool-button";
import ExportButton from "@/components/export-button";
import PoolerLinkInvitation from "@/components/pooler-link-invitation";
import { buildPoolExport, canScorePool } from "@/lib/pool-export";
import { calculatePoolStats } from "./in-progress/cumulative-tab/cumulative-calculation";
import { useSession } from "@/context/useSessionData";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  ClipboardList,
  Flag,
  LucideIcon,
  Settings2,
  ShieldCheck,
} from "lucide-react";

// The pool state is not worth a subtitle line, it sits next to the pool name as
// an icon. The label is both the tooltip and the accessible name.
const POOL_STATE_MARKER: Record<
  PoolState,
  { icon: LucideIcon; labelKey: string }
> = {
  [PoolState.Created]: { icon: Settings2, labelKey: "PoolCreatedState" },
  [PoolState.Draft]: { icon: ClipboardList, labelKey: "PoolDraftState" },
  [PoolState.InProgress]: { icon: Activity, labelKey: "PoolInProgressState" },
  [PoolState.Final]: { icon: Flag, labelKey: "PoolFinalState" },
  [PoolState.Dynasty]: { icon: ShieldCheck, labelKey: "PoolDynastyState" },
};

function PoolStateIcon({ status }: { status: PoolState }) {
  const t = useTranslations();
  const { icon: Icon, labelKey } = POOL_STATE_MARKER[status];
  const label = t(labelKey);

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex cursor-default rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <Icon className="size-5" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export default function PoolStatus() {
  const t = useTranslations();
  const {
    poolInfo,
    poolStartDate,
    poolSelectedEndDate,
    dailyPointsMade,
    dateOfInterest,
  } = usePoolContext();

  const userSession = useSession();

  /*
  The export document, built when a format is picked rather than here.

  It needs the same standings pass the cumulative tab makes, which walks every
  scored day of the season — so it runs on the click. The pass is the tab's own
  function and not a second implementation of it: an exported standing that
  disagrees with the one on screen would be worse than no export.
  */
  const buildExport = () => {
    // Skipped rather than guarded inside: the pass reads every participant's
    // roster without checking there is one, so a pool still in the lobby has
    // to be kept out of it entirely.
    const [playerStats, ranking] = canScorePool(poolInfo)
      ? calculatePoolStats(
          poolInfo,
          poolStartDate,
          poolSelectedEndDate,
          dailyPointsMade,
        )
      : [null, null];

    return buildPoolExport({
      poolInfo,
      playerStats,
      ranking,
      asOf: dateOfInterest,
      t,
    });
  };

  const titleAdornment = (
    <>
      <PoolStateIcon status={poolInfo.status} />
      <FavoritePoolButton
        poolName={poolInfo.name}
        kind="pool"
        season={poolInfo.season}
        className="-my-1"
      />
      <SharePoolButton poolName={poolInfo.name} className="-my-1" />
      <ExportButton
        build={buildExport}
        baseName={poolInfo.name}
        className="-my-1"
      />
    </>
  );

  if (
    poolInfo.status === PoolState.Created ||
    poolInfo.status === PoolState.Draft
  ) {
    return (
      <SocketProvider jwt={userSession.info?.jwt}>
        <PageTitle title={poolInfo.name} titleAdornment={titleAdornment} />
        <PoolerLinkInvitation />
        {poolInfo.status === PoolState.Created ? (
          <CreatedPool />
        ) : (
          <DraftPool />
        )}
      </SocketProvider>
    );
  }

  switch (poolInfo.status) {
    case PoolState.InProgress:
    case PoolState.Final:
      return (
        <>
          <PageTitle title={poolInfo.name} titleAdornment={titleAdornment} />
          <PoolerLinkInvitation />
          <InProgressPool />
        </>
      );
    case PoolState.Dynasty:
      return (
        <>
          <PageTitle title={poolInfo.name} titleAdornment={titleAdornment} />
          <PoolerLinkInvitation />
          <DynastyPool />
        </>
      );
  }
}
