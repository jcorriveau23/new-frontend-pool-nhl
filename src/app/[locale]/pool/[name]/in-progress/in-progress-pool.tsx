import * as React from "react";
import CumulativeTab from "./cumulative-tab/cumulative-tab";
import DailyTab from "./daily-tab/daily-tab";
import TradeList from "@/components/trade-list";
import HistoryTab from "./history-tab/history-tab";
import RecordsTab from "./records-tab/records-tab";
import DraftTab from "./draft-tab/draft-tab";
import SettingsTab from "./settings-tab/settings-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeftRight,
  CalendarDays,
  ClipboardList,
  History,
  LineChart,
  Settings,
  Trophy,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  GamesNightStatus,
  useGamesNightContext,
} from "@/context/games-night-context";
import { useRouter } from "@/i18n/routing";
import { usePoolContext } from "@/context/pool-context";
import LiveGamePopOver from "@/components/live-games-pop-over";
import { useSearchParams } from "next/navigation";

const TabLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="sr-only md:not-sr-only group-data-[active]:not-sr-only">
    {children}
  </span>
);

enum InProgressTabs {
  CUMULATIVE = "cumulative",
  DAILY = "daily",
  TRADE = "trade",
  HISTORY = "history",
  RECORDS = "records",
  DRAFT = "draft",
  SETTINGS = "settings",
}

export default function InProgressPool() {
  const t = useTranslations();
  const router = useRouter();
  const { gamesNightStatus } = useGamesNightContext();
  const { poolInfo, updateSelectedParticipant } = usePoolContext();
  const searchParams = useSearchParams();

  // The active tab is read straight off the URL rather than mirrored into
  // state: `useSearchParams` already re-renders on a back/forward navigation,
  // so going back to an entry that names no tab falls back to Cumulative
  // instead of leaving the previous tab selected.
  const requestedTab = searchParams.get("activeTab");
  const activeTab = Object.values(InProgressTabs).includes(
    requestedTab as InProgressTabs,
  )
    ? (requestedTab as InProgressTabs)
    : InProgressTabs.CUMULATIVE;

  const handleTabChange = (value: string) => {
    const queryParams = new URLSearchParams(searchParams.toString());
    queryParams.set("activeTab", value);
    // `replace` + `scroll: false`, like `updateSelectedParticipant` does: the
    // tab is a view of the same page, so it should neither jump back to the top
    // nor cost a history entry that the Back button has to walk through.
    router.replace(`/pool/${poolInfo.name}/?${queryParams.toString()}`, {
      scroll: false,
    });
  };

  React.useEffect(() => {
    // The selected pooler is held as state by the pool context, seeded from the
    // URL only on mount, so — unlike the tab above — it has to be restored by
    // hand when the user navigates back into the page.
    const handlePopState = () => {
      const queryParams = new URLSearchParams(window.location.search);
      const newSelectedParticipant = queryParams.get("selectedParticipant");

      if (newSelectedParticipant) {
        updateSelectedParticipant(newSelectedParticipant);
      }
    };

    window.addEventListener("popstate", handlePopState);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [updateSelectedParticipant]);

  return (
    <div className="items-center text-center">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-auto text-left">
          <TabsList>
            <TabsTrigger
              value={InProgressTabs.CUMULATIVE}
              className="group gap-2"
            >
              <LineChart className="size-4" />
              <TabLabel>{t("Cumulative")}</TabLabel>
              {gamesNightStatus === GamesNightStatus.LIVE ? (
                <LiveGamePopOver />
              ) : null}
            </TabsTrigger>
            <TabsTrigger value={InProgressTabs.DAILY} className="group gap-2">
              <CalendarDays className="size-4" />
              <TabLabel>{t("Daily")}</TabLabel>
              {gamesNightStatus === GamesNightStatus.LIVE ? (
                <LiveGamePopOver />
              ) : null}
            </TabsTrigger>
            {poolInfo.settings.dynasty_settings ? (
              <TabsTrigger value={InProgressTabs.TRADE} className="group gap-2">
                <ArrowLeftRight className="size-4" />
                <TabLabel>{t("Trade")}</TabLabel>
              </TabsTrigger>
            ) : null}
            {poolInfo.settings.dynasty_settings ||
            poolInfo.settings.roster_modification_date.length > 0 ? (
              <TabsTrigger
                value={InProgressTabs.HISTORY}
                className="group gap-2"
              >
                <History className="size-4" />
                <TabLabel>{t("History")}</TabLabel>
              </TabsTrigger>
            ) : null}
            <TabsTrigger value={InProgressTabs.RECORDS} className="group gap-2">
              <Trophy className="size-4" />
              <TabLabel>{t("Records")}</TabLabel>
            </TabsTrigger>
            <TabsTrigger value={InProgressTabs.DRAFT} className="group gap-2">
              <ClipboardList className="size-4" />
              <TabLabel>{t("Draft")}</TabLabel>
            </TabsTrigger>
            <TabsTrigger
              value={InProgressTabs.SETTINGS}
              className="group gap-2"
            >
              <Settings className="size-4" />
              <TabLabel>{t("Settings")}</TabLabel>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value={InProgressTabs.CUMULATIVE}>
          <CumulativeTab />
        </TabsContent>
        <TabsContent value={InProgressTabs.DAILY}>
          <DailyTab />
        </TabsContent>
        {poolInfo.settings.dynasty_settings ? (
          <TabsContent value={InProgressTabs.TRADE}>
            <TradeList />
          </TabsContent>
        ) : null}
        {poolInfo.settings.dynasty_settings ||
        poolInfo.settings.roster_modification_date.length > 0 ? (
          <TabsContent value={InProgressTabs.HISTORY}>
            <HistoryTab />
          </TabsContent>
        ) : null}
        <TabsContent value={InProgressTabs.RECORDS}>
          <RecordsTab />
        </TabsContent>
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
