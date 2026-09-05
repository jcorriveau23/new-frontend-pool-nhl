import * as React from "react";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Check,
  X,
  Trash2,
  Handshake,
  Plus,
} from "lucide-react";
import {
  DraftPick,
  Pool,
  Trade,
  TradeItems,
  TradeStatus,
} from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";
import { hasPoolPrivilege, usePoolContext } from "@/context/pool-context";
import { PoolerNameText } from "@/components/pooler-name";
import { useUser } from "@/context/useUserData";
import { useSession } from "@/context/useSessionData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ordinal } from "@/app/utils/formating";
import { useTradeBuilder } from "@/context/trade-builder-context";

const statusVariant = (
  status: TradeStatus,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case TradeStatus.NEW:
      return "default";
    case TradeStatus.ACCEPTED:
      return "secondary";
    default:
      return "outline";
  }
};

export default function TradeTab() {
  const { poolInfo, updatePoolInfo, dictUsers } = usePoolContext();
  const userData = useUser();
  const userSession = useSession();
  const { openTradeBuilder } = useTradeBuilder();
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

  const respondTrade = async (trade: Trade, isAccepted: boolean) => {
    if (!userSession.info?.jwt) {
      toast.error(t("LoginToTrade"), { duration: 3000 });
      return;
    }
    setPendingTradeId(trade.id);
    try {
      const res = await apiPost<Pool>(
        "/respond-trade",
        {
          pool_name: poolInfo.name,
          trade_id: trade.id,
          is_accepted: isAccepted,
        },
        userSession.info.jwt,
      );

      if (!res.ok) {
        toast.error(
          t("CouldNotRespondTrade", { name: poolInfo.name, error: res.error }),
          { duration: 5000 },
        );
        return;
      }

      updatePoolInfo(res.data);
      toast.success(isAccepted ? t("TradeAccepted") : t("TradeRefused"), {
        duration: 2000,
      });
    } finally {
      setPendingTradeId(null);
    }
  };

  const deleteTrade = async (trade: Trade) => {
    if (!userSession.info?.jwt) {
      toast.error(t("LoginToTrade"), { duration: 3000 });
      return;
    }
    setPendingTradeId(trade.id);
    try {
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

  const trades = poolInfo.trades ?? [];
  const pendingTrades = trades.filter((tr) => tr.status === TradeStatus.NEW);
  const pastTrades = trades.filter((tr) => tr.status !== TradeStatus.NEW);

  const TradeCard = (trade: Trade) => {
    const isBusy = pendingTradeId === trade.id;
    const canRespond =
      trade.status === TradeStatus.NEW && canActAs(trade.ask_to);
    const canCancel =
      trade.status === TradeStatus.NEW && canActAs(trade.proposed_by);
    const date =
      trade.date_accepted > 0 ? trade.date_accepted : trade.date_created;

    return (
      <Card key={trade.id} className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ArrowLeftRight size={14} />
            {t("Trade")}
          </div>
          <div className="flex items-center gap-2">
            {date > 0 ? (
              <span className="text-xs text-muted-foreground">
                {format.dateTime(new Date(date), {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
            <Badge variant={statusVariant(trade.status)}>
              {t(trade.status)}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {TradeSide(trade.proposed_by, trade.from_items)}
          <ArrowLeftRight className="mx-auto h-4 w-4 shrink-0 text-muted-foreground sm:mx-1" />
          {TradeSide(trade.ask_to, trade.to_items)}
        </div>

        {canRespond || canCancel ? (
          <>
            <Separator />
            <div className="flex flex-wrap justify-end gap-2">
              {canRespond ? (
                <>
                  <Button
                    size="sm"
                    disabled={isBusy}
                    onClick={() => respondTrade(trade, true)}
                  >
                    <Check className="mr-1.5 h-4 w-4" />
                    {t("Accept")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => respondTrade(trade, false)}
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    {t("Refuse")}
                  </Button>
                </>
              ) : null}
              {canCancel ? (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isBusy}
                  onClick={() => deleteTrade(trade)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {t("Cancel")}
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </Card>
    );
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-1 text-left">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("Trade")}</h2>
        <Button onClick={() => openTradeBuilder()}>
          <Plus className="mr-2 h-4 w-4" />
          {t("ProposeTrade")}
        </Button>
      </div>

      {trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Handshake className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">{t("NoTrades")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("NoTradesDescription")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pendingTrades.length > 0 ? (
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {t("Pending")}
              <Badge variant="secondary">{pendingTrades.length}</Badge>
            </div>
          ) : null}
          {pendingTrades.map(TradeCard)}
          {pendingTrades.length > 0 && pastTrades.length > 0 ? (
            <Separator className="my-2" />
          ) : null}
          {pastTrades.map(TradeCard)}
        </div>
      )}
    </div>
  );
}
