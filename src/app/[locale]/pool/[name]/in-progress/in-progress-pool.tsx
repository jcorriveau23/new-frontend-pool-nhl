import * as React from "react";
import { Pool, PoolState } from "@/data/pool/model";
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
import { usePoolContext } from "@/context/pool-context";

enum InProgressTabs {
  CUMULATIVE = "cumulative",
  DAILY = "daily",
  TRADE = "trade",
  HISTORY = "history",
  DRAFT = "draft",
  SETTINGS = "settings",
}

export default function InProgressPool() {
  const t = useTranslations();
  const router = useRouter();
  const { gamesNightStatus } = useGamesNightContext();
  const { poolInfo, updateSelectedParticipant } = usePoolContext();

  const getInitialSelectedTab = (): string => {
    // Return the initial tab selection using the url parameters if it exist.
    const queryParams = new URLSearchParams(window.location.search);
    const initialTab = queryParams.get("activeTab");

    if (
      initialTab === null ||
      !Object.values(InProgressTabs).includes(initialTab as InProgressTabs)
    ) {
      // If the pool is complete, always show the cummulative tab.
      if (poolInfo.status === PoolState.Final) {
        return InProgressTabs.CUMULATIVE;
      }

      return gamesNightStatus === GamesNightStatus.LIVE
        ? InProgressTabs.DAILY
        : InProgressTabs.CUMULATIVE;
    }

    return initialTab;
  };

  const [activeTab, setActiveTab] = React.useState(getInitialSelectedTab());

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set("activeTab", value);
    router.push(`/pool/${poolInfo.name}/?${queryParams.toString()}`);
  };

  React.useEffect(() => {
    // Use effect is used here to manage the popstate event listener.
    // That way if the user go into antoher page and come back using the "Go Back" or "Go forward"
    // options in the browser he will be in the selected tab.
    const handlePopState = (event: PopStateEvent) => {
      const queryParams = new URLSearchParams(window.location.search);
      const newActiveTab = queryParams.get("activeTab");
      const newSelectedParticipant = queryParams.get("selectedParticipant");

      if (newActiveTab && newActiveTab !== activeTab) {
        setActiveTab(newActiveTab);
      }
      if (newSelectedParticipant) {
        updateSelectedParticipant(newSelectedParticipant);
      }
    };

    window.addEventListener("popstate", handlePopState);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

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
            {poolInfo.settings.can_trade ? (
              <TabsTrigger value={InProgressTabs.TRADE}>
                {t("Trade")}
              </TabsTrigger>
            ) : null}
            {poolInfo.settings.can_trade ||
            poolInfo.settings.roster_modification_date.length > 0 ? (
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
          <CumulativeTab />
        </TabsContent>
        <TabsContent value={InProgressTabs.DAILY}>
          <DailyTab />
        </TabsContent>
        {poolInfo.settings.can_trade ? (
          <TabsContent value={InProgressTabs.TRADE}>
            <TradeTab />
          </TabsContent>
        ) : null}
        {poolInfo.settings.can_trade ||
        poolInfo.settings.roster_modification_date.length > 0 ? (
          <TabsContent value={InProgressTabs.HISTORY}>
            <HistoryTab />
          </TabsContent>
        ) : null}
        <TabsContent value={InProgressTabs.DRAFT}>
          <DraftTab />
        </TabsContent>
        <TabsContent value={InProgressTabs.SETTINGS}>
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
