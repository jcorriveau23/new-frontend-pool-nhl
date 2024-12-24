import * as React from "react";
import { useTranslations } from "next-intl";
import { Accordion } from "@radix-ui/react-accordion";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from "date-fns";
import { TradeItem } from "@/components/trade";
import { usePoolContext } from "@/context/pool-context";

export default function TradeTab() {
  const t = useTranslations();
  const { poolInfo } = usePoolContext();

  return (
    <div>
      {poolInfo.trades?.map((trade) => (
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
            <AccordionContent>
              <TradeItem trade={trade} poolInfo={poolInfo} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
  );
}
