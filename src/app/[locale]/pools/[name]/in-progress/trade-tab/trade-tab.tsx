import * as React from "react";
import { Pool } from "@/data/pool/model";
import { useTranslations } from "next-intl";
import { Accordion } from "@radix-ui/react-accordion";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from "date-fns";
import { TradeItem } from "@/components/trade";

interface Props {
  poolInfo: Pool;
}

export default function TradeTab(props: Props) {
  const t = useTranslations();

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
            <AccordionContent>
              <TradeItem trade={trade} poolInfo={props.poolInfo} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
  );
}
