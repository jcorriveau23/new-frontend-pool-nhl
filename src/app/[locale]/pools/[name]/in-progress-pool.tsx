import * as React from "react";
import { Pool } from "@/data/pool/model";
import CumulativeTab from "./in-progress/cumulative-tab/cumulative-tab";
import DailyTab from "./in-progress/daily-tab/daily-tab";
import TradeTab from "./trade-tab";
import HistoryTab from "./history-tab";
import DraftTab from "./draft-tab";
import SettingsTab from "./settings-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
interface Props {
  poolInfo: Pool;
}

export default function InProgressPool(props: Props) {
  const t = useTranslations();
  return (
    <div className="items-center text-center">
      <Tabs defaultValue="cumulative">
        <div className="overflow-auto">
          <TabsList>
            <TabsTrigger value="cumulative">{t("Cumulative")}</TabsTrigger>
            <TabsTrigger value="daily">{t("Daily")}</TabsTrigger>
            <TabsTrigger value="trade">{t("Trade")}</TabsTrigger>
            <TabsTrigger value="history">{t("History")}</TabsTrigger>
            <TabsTrigger value="draft">{t("Draft")}</TabsTrigger>
            <TabsTrigger value="settings">{t("Settings")}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="cumulative">
          <CumulativeTab poolInfo={props.poolInfo}></CumulativeTab>
        </TabsContent>
        <TabsContent value="daily">
          <DailyTab poolInfo={props.poolInfo}></DailyTab>
        </TabsContent>
        <TabsContent value="trade">
          <TradeTab poolInfo={props.poolInfo}></TradeTab>
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab poolInfo={props.poolInfo}></HistoryTab>
        </TabsContent>
        <TabsContent value="draft">
          <DraftTab poolInfo={props.poolInfo}></DraftTab>
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab poolInfo={props.poolInfo}></SettingsTab>
        </TabsContent>
      </Tabs>
    </div>
  );
}
