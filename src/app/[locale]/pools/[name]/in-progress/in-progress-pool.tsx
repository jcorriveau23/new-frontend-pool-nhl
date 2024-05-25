import * as React from "react";
import { Pool } from "@/data/pool/model";
import CumulativeTab from "./cumulative-tab/cumulative-tab";
import DailyTab from "./daily-tab/daily-tab";
import TradeTab from "./trade-tab/trade-tab";
import HistoryTab from "./history-tab/history-tab";
import DraftTab from "./draft-tab/draft-tab";
import SettingsTab from "./settings-tab/settings-tab";
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
import { useRouter } from "@/navigation";

interface Props {
  poolInfo: Pool;
}

enum InProgressTabs {
  CUMULATIVE = "cumulative",
  DAILY = "daily",
  TRADE = "trade",
  HISTORY = "history",
  DRAFT = "draft",
  SETTINGS = "settings",
}

export default function InProgressPool(props: Props) {
  const t = useTranslations();
  const router = useRouter();
  const { gamesNightStatus } = useGamesNightContext();

  const getInitialSelectedTab = (): string => {
    // Return the initial tab selection using the url parameters if it exist.
    // That way if the user go into antoher page and come back using the "Go Back"
    // option in the browser he will be in  the selected tab.
    const queryParams = new URLSearchParams(window.location.search);
    const initialTab = queryParams.get("activeTab");

    if (
      initialTab === null ||
      !Object.values(InProgressTabs).includes(initialTab as InProgressTabs)
    ) {
      return gamesNightStatus === GamesNightStatus.LIVE
        ? "daily"
        : "cumulative";
    }

    return initialTab;
  };

  const [activeTab, setActiveTab] = React.useState(getInitialSelectedTab());

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set("activeTab", value);
    router.push(`/pools/${props.poolInfo.name}/?${queryParams.toString()}`);
  };

  return (
    <div className="items-center text-center">
      <Tabs
        value={activeTab}
        defaultValue={activeTab}
        onValueChange={handleTabChange}
      >
        <div className="overflow-auto">
          <TabsList>
            <TabsTrigger value={InProgressTabs.CUMULATIVE}>
              {t("Cumulative")}
            </TabsTrigger>
            <TabsTrigger value={InProgressTabs.DAILY}>
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
              <TabsTrigger value={InProgressTabs.TRADE}>
                {t("Trade")}
              </TabsTrigger>
            ) : null}
            {props.poolInfo.settings.can_trade ||
            props.poolInfo.settings.roster_modification_date.length > 0 ? (
              <TabsTrigger value={InProgressTabs.HISTORY}>
                {t("History")}
              </TabsTrigger>
            ) : null}
            <TabsTrigger value={InProgressTabs.DRAFT}>{t("Draft")}</TabsTrigger>
            <TabsTrigger value={InProgressTabs.SETTINGS}>
              {t("Settings")}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value={InProgressTabs.CUMULATIVE}>
          <CumulativeTab poolInfo={props.poolInfo}></CumulativeTab>
        </TabsContent>
        <TabsContent value={InProgressTabs.DAILY}>
          <DailyTab poolInfo={props.poolInfo}></DailyTab>
        </TabsContent>
        {props.poolInfo.settings.can_trade ? (
          <TabsContent value={InProgressTabs.TRADE}>
            <TradeTab poolInfo={props.poolInfo}></TradeTab>
          </TabsContent>
        ) : null}
        {props.poolInfo.settings.can_trade ||
        props.poolInfo.settings.roster_modification_date.length > 0 ? (
          <TabsContent value={InProgressTabs.HISTORY}>
            <HistoryTab poolInfo={props.poolInfo}></HistoryTab>
          </TabsContent>
        ) : null}
        <TabsContent value={InProgressTabs.DRAFT}>
          <DraftTab poolInfo={props.poolInfo}></DraftTab>
        </TabsContent>
        <TabsContent value={InProgressTabs.SETTINGS}>
          <SettingsTab poolInfo={props.poolInfo}></SettingsTab>
        </TabsContent>
      </Tabs>
    </div>
  );
}
