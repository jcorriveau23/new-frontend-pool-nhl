/*
The trades of a pool: what has been agreed, and the button that files a new one.

A trade here is a record of a deal the poolers already made between themselves,
not a proposal waiting on an answer — filing it moves the players and picks
there and then. Undoing one is deleting it, which puts every item back.

Poolers trade in three of the pool states, so this is shared rather than living
in the in-progress tabs: during the season, during the dynasty protection
window (where a trade voids both poolers' protection lists), and during the
draft itself (where the picks being moved are the ones of that very draft).
*/
"use client";

import * as React from "react";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Check,
  Handshake,
  Info,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DraftPick,
  Pool,
  PoolState,
  Trade,
  TradeItems,
  TradeStatus,
} from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";
import { hasPoolPrivilege, usePoolContext } from "@/context/pool-context";
import { PoolerNameText } from "@/components/pooler-name";
import { useUser } from "@/context/useUserData";
import { useSession } from "@/context/useSessionData";
import { Command, useOptionalSocketContext } from "@/context/socket-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ordinal } from "@/app/utils/formating";
import { useTradeBuilder } from "@/context/trade-builder-context";

// What trading means in the state the pool is in. The rules are not the same
// on either side of a draft, and a pooler about to hand over a protected
// player deserves to know before they do it.
const STATE_HINT_KEY: Partial<Record<PoolState, string>> = {
  [PoolState.Dynasty]: "TradeDuringProtectionHint",
  [PoolState.Draft]: "TradeDuringDraftHint",
};

export default function TradeList() {
  const { poolInfo, updatePoolInfo, dictUsers } = usePoolContext();
  const userData = useUser();
  const userSession = useSession();
  const { openTradeBuilder, openTradeEditor } = useTradeBuilder();
  // Present on the draft page only; undefined everywhere else.
  const socketContext = useOptionalSocketContext();
  const t = useTranslations();
  const format = useFormatter();

  const [pendingTradeId, setPendingTradeId] = React.useState<number | null>(
    null,
  );

  // Whether the current user is allowed to act on behalf of a given pooler.
  const canActAs = (poolerId: string): boolean => {
    if (!userData.info?.id) return false;
    return (
      userData.info.id === poolerId ||
      hasPoolPrivilege(userData.info.id, poolInfo)
    );
  };

  const deleteTrade = async (trade: Trade) => {
    if (!userSession.info?.jwt) {
      toast.error(t("LoginToTrade"), { duration: 3000 });
      return;
    }
    setPendingTradeId(trade.id);
    try {
      // Same split as filing one: the room hears about it over the socket while
      // the draft runs, over REST everywhere else.
      if (socketContext) {
        socketContext.sendSocketCommand(
          Command.DeleteTrade,
          JSON.stringify({ trade_id: trade.id }),
        );
        toast.success(t("TradeCancelled"), { duration: 2000 });
        return;
      }

      const res = await apiPost<Pool>(
        "/delete-trade",
        { pool_name: poolInfo.name, trade_id: trade.id },
        userSession.info.jwt,
      );

      if (!res.ok) {
        toast.error(
          t("CouldNotCancelTrade", { name: poolInfo.name, error: res.error }),
          { duration: 5000 },
        );
        return;
      }

      updatePoolInfo(res.data);
      toast.success(t("TradeCancelled"), { duration: 2000 });
    } finally {
      setPendingTradeId(null);
    }
  };

  const confirmTrade = async (trade: Trade) => {
    if (!userSession.info?.jwt) {
      toast.error(t("LoginToTrade"), { duration: 3000 });
      return;
    }
    setPendingTradeId(trade.id);
    try {
      if (socketContext) {
        socketContext.sendSocketCommand(
          Command.ConfirmTrade,
          JSON.stringify({ trade_id: trade.id }),
        );
        toast.success(t("TradeConfirmed"), { duration: 2000 });
        return;
      }

      const res = await apiPost<Pool>(
        "/confirm-trade",
        { pool_name: poolInfo.name, trade_id: trade.id },
        userSession.info.jwt,
      );

      if (!res.ok) {
        toast.error(
          t("CouldNotConfirmTrade", { name: poolInfo.name, error: res.error }),
          { duration: 5000 },
        );
        return;
      }

      updatePoolInfo(res.data);
      toast.success(t("TradeConfirmed"), { duration: 2000 });
    } finally {
      setPendingTradeId(null);
    }
  };

  const TradedPicks = (picks: DraftPick[]) =>
    picks.map((pick) => (
      <Badge key={`${pick.from}-${pick.round}`} variant="secondary">
        {ordinal(pick.round + 1)} ({dictUsers[pick.from]?.name})
      </Badge>
    ));

  const TradeSide = (poolerId: string, items: TradeItems) => (
    <div className="flex-1 space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
          {dictUsers[poolerId]?.name.slice(0, 2)}
        </span>
        <PoolerNameText
          name={dictUsers[poolerId]?.name}
          className="font-semibold"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.players.map((playerId) => (
          <Badge key={playerId}>
            {poolInfo.context?.players[playerId]?.name}
          </Badge>
        ))}
        {TradedPicks(items.picks)}
        {items.players.length === 0 && items.picks.length === 0 ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : null}
      </div>
    </div>
  );

  // Open trades first — they are the ones waiting on the owner — then the
  // confirmed ones newest first, the last deal being what everybody looks for.
  const trades = [...(poolInfo.trades ?? [])].sort((a, b) => {
    const aOpen = a.status === TradeStatus.Open;
    const bOpen = b.status === TradeStatus.Open;
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    return b.id - a.id;
  });

  const TradeCard = (trade: Trade) => {
    const isBusy = pendingTradeId === trade.id;
    const isOpen = trade.status === TradeStatus.Open;
    // Either side of the deal can take it back, and so can the owner.
    const canDelete = canActAs(trade.proposed_by) || canActAs(trade.ask_to);
    // Correcting and signing off are the owner's and the assistants' alone,
    // which is what makes filing safe to leave open to everyone.
    const canSignOff = isOpen && hasPoolPrivilege(userData.info?.id, poolInfo);

    return (
      <Card key={trade.id} className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ArrowLeftRight size={14} />
            {t("Trade")}
            <Badge variant={isOpen ? "outline" : "secondary"}>
              {isOpen ? t("TradeOpen") : t("TradeConfirmedStatus")}
            </Badge>
          </div>
          {/* The day the trade counts from, which is what matters when reading
              the season back — not the day somebody got around to filing it. */}
          {trade.effective_date ? (
            <span className="text-xs text-muted-foreground">
              {t("EffectiveOn", {
                date: format.dateTime(
                  new Date(`${trade.effective_date}T00:00:00`),
                  { month: "short", day: "numeric", year: "numeric" },
                ),
              })}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {TradeSide(trade.proposed_by, trade.from_items)}
          <ArrowLeftRight className="mx-auto h-4 w-4 shrink-0 text-muted-foreground sm:mx-1" />
          {TradeSide(trade.ask_to, trade.to_items)}
        </div>

        {canDelete || canSignOff ? (
          <>
            <Separator />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="mr-auto text-xs text-muted-foreground">
                {isOpen ? t("OpenTradeHint") : t("DeleteTradeHint")}
              </span>
              {canSignOff ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => openTradeEditor(trade)}
                  >
                    <Pencil className="mr-1.5 h-4 w-4" />
                    {t("Edit")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={isBusy}
                    onClick={() => confirmTrade(trade)}
                  >
                    <Check className="mr-1.5 h-4 w-4" />
                    {t("Confirm")}
                  </Button>
                </>
              ) : null}
              {canDelete ? (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isBusy}
                  onClick={() => deleteTrade(trade)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {t("Delete")}
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </Card>
    );
  };

  const stateHintKey = STATE_HINT_KEY[poolInfo.status];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-1 text-left">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("Trade")}</h2>
        <Button onClick={() => openTradeBuilder()}>
          <Plus className="mr-2 h-4 w-4" />
          {t("FileTrade")}
        </Button>
      </div>

      {stateHintKey ? (
        <p className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {t(stateHintKey)}
        </p>
      ) : null}

      {trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Handshake className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">{t("NoTrades")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("NoTradesDescription")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">{trades.map(TradeCard)}</div>
      )}
    </div>
  );
}
