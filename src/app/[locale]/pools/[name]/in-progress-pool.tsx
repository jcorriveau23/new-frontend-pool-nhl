import * as React from "react";
import { Pool } from "@/data/pool/model";
import CumulativeTab from "./in-progress/cumulative-tab/cumulative-tab";
import DailyTab from "./in-progress/daily-tab/daily-tab";
import TradeTab from "./in-progress/trade-tab/trade-tab";
import HistoryTab from "./in-progress/history-tab/history-tab";
import DraftTab from "./in-progress/draft-tab/draft-tab";
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
            {props.poolInfo.settings.can_trade ? (
              <TabsTrigger value="trade">{t("Trade")}</TabsTrigger>
            ) : null}
            {props.poolInfo.settings.can_trade ||
            props.poolInfo.settings.roster_modification_date.length > 0 ? (
              <TabsTrigger value="history">{t("History")}</TabsTrigger>
            ) : null}
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
        {props.poolInfo.settings.can_trade ? (
          <TabsContent value="trade">
            <TradeTab poolInfo={props.poolInfo}></TradeTab>
          </TabsContent>
        ) : null}
        {props.poolInfo.settings.can_trade ||
        props.poolInfo.settings.roster_modification_date.length > 0 ? (
          <TabsContent value="history">
            <HistoryTab poolInfo={props.poolInfo}></HistoryTab>
          </TabsContent>
        ) : null}
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
