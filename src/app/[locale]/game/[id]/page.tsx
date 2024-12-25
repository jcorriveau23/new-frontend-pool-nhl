import * as React from "react";

import GameSummary from "./summary";
import GameBoxscore from "./boxscore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageTitle from "@/components/page-title";
import { getTranslations } from "next-intl/server";

export default async function Game(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const t = await getTranslations();
  return (
    <div className="items-center text-center">
      <PageTitle title={t("NhlGameInformationPageTitle")} />
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">{t("Summary")}</TabsTrigger>
          <TabsTrigger value="boxscore">{t("Boxscore")}</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <GameSummary gameId={params.id} />
        </TabsContent>
        <TabsContent value="boxscore">
          <GameBoxscore gameId={params.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
