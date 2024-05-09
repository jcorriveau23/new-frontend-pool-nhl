import * as React from "react";
import { DraftPick, Pool, Trade, TradeItems } from "@/data/pool/model";
import { usePoolContext } from "@/context/pool-context";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ordinal } from "@/app/utils/formating";
import { Accordion } from "@radix-ui/react-accordion";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from "date-fns";

interface Props {
  poolInfo: Pool;
}

export default function TradeTab(props: Props) {
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
      <div className="mt-2">
        {tradeItems.players.map((playerId) => (
          <Badge key={playerId}>
            {props.poolInfo.context?.players[playerId].name}
          </Badge>
        ))}
        {tradeItems.picks.length > 0 ? TradedPicks(tradeItems.picks) : null}
      </div>
    </>
  );

  const Trade = (trade: Trade) => (
    <div className="border">
      <div className="flex p-2 m-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <div className="border">
            <h3 className="text-lg font-semibold">{dictUsers[trade.ask_to]}</h3>
            {Side(trade.to_items)}
          </div>
          <div className="border">
            <h3 className="text-lg font-semibold">
              {dictUsers[trade.proposed_by]}
            </h3>
            {Side(trade.from_items)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {props.poolInfo.trades?.map((trade) => (
        <Accordion
          key={trade.id}
          type="single"
          collapsible
          defaultValue={trade.id.toString()}
        >
          <AccordionItem value={trade.id.toString()}>
            <AccordionTrigger>
              {`${t(trade.status)} (${format(
                trade.date_accepted > 0
                  ? trade.date_accepted
                  : trade.date_created,
                "yyyy-MM-dd HH:mm"
              )})`}
            </AccordionTrigger>
            <AccordionContent>{Trade(trade)}</AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
  );
}
