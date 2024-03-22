import * as React from "react";

import GameSummary from "./summary";
import GameBoxscore from "./boxscore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

export default function Game({ params }: { params: { id: string } }) {
  // translations states
  const t = useTranslations();
  return (
    <div className="items-center text-center">
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
