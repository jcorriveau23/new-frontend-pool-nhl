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
import {
  GamesNightStatus,
  useGamesNightContext,
} from "@/context/games-night-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LucideAlertOctagon } from "lucide-react";

interface Props {
  poolInfo: Pool;
}

export default function InProgressPool(props: Props) {
  const t = useTranslations();
  const { gamesNightStatus } = useGamesNightContext();
  return (
    <div className="items-center text-center">
      <Tabs
        defaultValue={
          gamesNightStatus == GamesNightStatus.LIVE ? "daily" : "cumulative"
        }
      >
        <div className="overflow-auto">
          <TabsList>
            <TabsTrigger value="cumulative">{t("Cumulative")}</TabsTrigger>
            <TabsTrigger value="daily">
              {t("Daily")}
              <div className="pl-1">
                {gamesNightStatus === GamesNightStatus.LIVE ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <LucideAlertOctagon color="red" />
                    </PopoverTrigger>
                    <PopoverContent align="start">
                      {t("liveGame")}
                    </PopoverContent>
                  </Popover>
                ) : null}
              </div>
            </TabsTrigger>
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
