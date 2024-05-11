import * as React from "react";
import { DraftPick, Pool, Trade, TradeItems } from "@/data/pool/model";
import { Badge } from "./ui/badge";
import { ordinal } from "@/app/utils/formating";
import { usePoolContext } from "@/context/pool-context";
import { useTranslations } from "next-intl";

interface Props {
  trade: Trade;
  poolInfo: Pool;
}

export function TradeItem(props: Props) {
  const { dictUsers } = usePoolContext();
  const t = useTranslations();

  const TradedPicks = (picks: DraftPick[]) =>
    picks.map((p) => (
      <Badge key={`${p.from}${p.round}`} variant="secondary">
        {ordinal(p.round + 1)} {`(${dictUsers[p.from]})`}
      </Badge>
    ));

  const Side = (tradeItems: TradeItems) => (
    <>
      <div className="m-2">
        {tradeItems.players.map((playerId) => (
          <Badge key={playerId}>
            {props.poolInfo.context?.players[playerId].name}
          </Badge>
        ))}
        {tradeItems.picks.length > 0 ? TradedPicks(tradeItems.picks) : null}
      </div>
    </>
  );

  return (
    <div className="border">
      <div className="flex p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <div className="border">
            <h3 className="text-lg font-semibold">
              {dictUsers[props.trade.ask_to]}
            </h3>
            {Side(props.trade.to_items)}
          </div>
          <div className="border">
            <h3 className="text-lg font-semibold">
              {dictUsers[props.trade.proposed_by]}
            </h3>
            {Side(props.trade.from_items)}
          </div>
        </div>
      </div>
    </div>
  );
}
