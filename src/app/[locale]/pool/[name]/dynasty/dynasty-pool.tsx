import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePoolContext } from "@/context/pool-context";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import DraftTab from "./draft-tab/draft-tab";
import SettingsTab from "./settings-tab/settings-tab";
import RosterTab from "./roster-tab/roster-tab";
import NhlPlayersTab from "./nhl-players-tab/nhl-players-tab";
import { salaryFormat, seasonFormat } from "@/app/utils/formating";

enum DynastyTabs {
  ROSTER = "roster",
  DRAFT = "draft",
  SETTINGS = "settings",
  NHL_PLAYERS = "NhlPlayers",
}

export default function DynastyPool() {
  const { poolInfo, updateSelectedParticipant } = usePoolContext();
  const router = useRouter();

  const getInitialSelectedTab = (): string => {
    // Return the initial tab selection using the url parameters if it exist.
    const queryParams = new URLSearchParams(window.location.search);
    const initialTab = queryParams.get("activeTab");

    if (
      initialTab === null ||
      !Object.values(DynastyTabs).includes(initialTab as DynastyTabs)
    ) {
      return DynastyTabs.ROSTER;
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
    // That way if the user go into another page and come back using the "Go Back" or "Go forward"
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

  const t = useTranslations();

  return (
    <div className="items-center text-center">
      <div className="text-left">
        <div>
          <p>
            {t("DynastyDescription", {
              protectedCount:
                poolInfo.settings.dynasty_settings
                  ?.next_season_number_players_protected,
            })}
          </p>
          {poolInfo.settings.salary_cap ? (
            <p>
              {t("DynastySalaryCapDescription", {
                season: seasonFormat(poolInfo.season, 0),
                salaryCap: salaryFormat(poolInfo.settings.salary_cap),
              })}
            </p>
          ) : null}
        </div>
      </div>
      <Tabs
        value={activeTab}
        defaultValue={activeTab}
        onValueChange={handleTabChange}
      >
        <div className="overflow-auto">
          <TabsList>
            <TabsTrigger value={DynastyTabs.ROSTER}>{t("Roster")}</TabsTrigger>
            {/* <TabsTrigger value={DynastyTabs.NHL_PLAYERS}>
              {t("NhlPlayers")}
            </TabsTrigger> */}
            <TabsTrigger value={DynastyTabs.DRAFT}>{t("Draft")}</TabsTrigger>
            <TabsTrigger value={DynastyTabs.SETTINGS}>
              {t("Settings")}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value={DynastyTabs.ROSTER}>
          <RosterTab />
        </TabsContent>
        {/* <TabsContent value={DynastyTabs.NHL_PLAYERS}>
          <NhlPlayersTab />
        </TabsContent> */}
        <TabsContent value={DynastyTabs.DRAFT}>
          <DraftTab />
        </TabsContent>
        <TabsContent value={DynastyTabs.SETTINGS}>
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
