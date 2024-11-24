import { DataTable } from "@/components/ui/data-table";
import { DailyGoalie, DailySkater } from "@/data/dailyLeaders/model";
import React from "react";
import {
  DailyGoaliesLeadersColumn,
  DailyScoringLeadersColumn,
  DefensesDailyTotalColumn,
  SkaterDailyColumn,
  ForwardsDailyTotalColumn,
  GoaliesColumn,
  GoaliesDailyTotalColumn,
  TotalDailyColumn,
} from "./stats-columns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import {
  GoalieDailyInfo,
  SkaterDailyInfo,
  TotalDailyPoints,
  usePoolContext,
} from "@/context/pool-context";
import { Row } from "@tanstack/react-table";
import { PoolerUserSelector } from "@/components/pool-user-selector";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useDailyLeadersContext } from "@/context/daily-leaders-context";
import { GameStatePopover } from "@/components/game-state-popover";
import { GamesNightStatus } from "@/context/games-night-context";

export default function DailyStatsContent() {
  const t = useTranslations();
  const {
    poolInfo,
    dictUsers,
    selectedParticipant,
    selectedPoolUser,
    updateSelectedParticipant,
    playersOwner,
    dailyPointsMade,
  } = usePoolContext();
  const { dailyLeaders } = useDailyLeadersContext();

  const SkatersTable = (
    skaters: SkaterDailyInfo[],
    columns: ColumnDef<SkaterDailyInfo>[],
    title: string
  ) => (
    <DataTable
      data={skaters}
      columns={columns}
      initialState={{
        sorting: [
          {
            id: "poolPoints",
            desc: true,
          },
        ],
        columnPinning: { left: ["player"] },
      }}
      meta={{
        props: poolInfo,
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={title}
      tableFooter={null}
    />
  );

  const GoaliesTable = (goalies: GoalieDailyInfo[], title: string) => (
    <DataTable
      data={goalies}
      columns={GoaliesColumn}
      initialState={{
        sorting: [
          {
            id: "poolPoints",
            desc: true,
          },
        ],
        columnPinning: { left: ["player"] },
      }}
      meta={{
        props: poolInfo,
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={title}
      tableFooter={null}
    />
  );

  const TotalDailyRankTable = (
    totalDailyPoints: TotalDailyPoints[],
    columns: ColumnDef<TotalDailyPoints>[],
    title: string
  ) => (
    <DataTable
      data={totalDailyPoints}
      columns={columns}
      initialState={{
        sorting: [
          {
            id: "totalPoolPoints",
            desc: true,
          },
        ],
        columnPinning: { left: ["ranking", "pooler"] },
      }}
      meta={{
        props: {},
        getRowStyles: (row: Row<TotalDailyPoints>) => {
          if (row.original.participant === selectedParticipant) {
            return "bg-selection hover:bg-selection";
          }
        },
        onRowClick: (row: Row<TotalDailyPoints>) => {
          updateSelectedParticipant(row.original.participant);
        },
        t: t,
      }}
      title={title}
      tableFooter={null}
    />
  );

  const DailyScoringLeadersTable = (skaters: DailySkater[], title: string) => (
    <DataTable
      data={skaters}
      columns={DailyScoringLeadersColumn}
      initialState={{
        sorting: [
          {
            id: "points",
            desc: true,
          },
        ],
        columnPinning: { left: ["ranking", "name"] },
      }}
      meta={{
        props: { playersOwner, dictUsers },
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={title}
      tableFooter={null}
    />
  );

  const DailyGoaliesLeadersTable = (goalies: DailyGoalie[], title: string) => (
    <DataTable
      data={goalies}
      columns={DailyGoaliesLeadersColumn}
      initialState={{
        sorting: [
          {
            id: "savePercentage",
            desc: true,
          },
        ],
        columnPinning: { left: ["ranking", "name"] },
      }}
      meta={{
        props: { playersOwner, dictUsers },
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={title}
      tableFooter={null}
    />
  );

  const getFormatedRankingTableTitle = (title: string) =>
    `${t(title)} (${dailyPointsMade?.dateOfInterest})`;

  const getFormatedDateTitle = (participant: string, title: string) =>
    `${t(title)} ${participant} (${dailyPointsMade?.dateOfInterest})`;

  return (
    <div>
      <div className="py-5 px-0 sm:px-5">
        {dailyPointsMade ? (
          <Tabs defaultValue="totalRanking">
            <div className="overflow-auto">
              <TabsList>
                <div className="mr-2">
                  <GameStatePopover
                    state={
                      dailyPointsMade.cumulated
                        ? GamesNightStatus.COMPLETED
                        : GamesNightStatus.LIVE
                    }
                  />
                </div>
                <TabsTrigger value="totalRanking">{t("Total")}</TabsTrigger>
                <TabsTrigger value="forwardRanking">
                  {t("Forwards")}
                </TabsTrigger>
                <TabsTrigger value="defenseRanking">{t("Defense")}</TabsTrigger>
                <TabsTrigger value="goaliesRanking">{t("Goalies")}</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="totalRanking">
              {TotalDailyRankTable(
                dailyPointsMade.totalDailyPoints,
                TotalDailyColumn,
                getFormatedRankingTableTitle("DailyRanking")
              )}
            </TabsContent>
            <TabsContent value="forwardRanking">
              {TotalDailyRankTable(
                dailyPointsMade.totalDailyPoints,
                ForwardsDailyTotalColumn,
                getFormatedRankingTableTitle("ForwardDailyRanking")
              )}
            </TabsContent>
            <TabsContent value="defenseRanking">
              {TotalDailyRankTable(
                dailyPointsMade.totalDailyPoints,
                DefensesDailyTotalColumn,
                getFormatedRankingTableTitle("DefenseDailyRanking")
              )}
            </TabsContent>
            <TabsContent value="goaliesRanking">
              {TotalDailyRankTable(
                dailyPointsMade.totalDailyPoints,
                GoaliesDailyTotalColumn,
                getFormatedRankingTableTitle("GoaliesDailyRanking")
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <LoadingSpinner />
        )}
      </div>
      <div className="py-5 px-0 sm:px-5">
        <PoolerUserSelector />
        {dailyPointsMade ? (
          <>
            <Accordion
              key={`${selectedPoolUser.id}-forwards`}
              type="single"
              collapsible
              defaultValue="forwards"
            >
              <AccordionItem value="forwards">
                <AccordionTrigger>{t("Forwards")}</AccordionTrigger>
                <AccordionContent>
                  {SkatersTable(
                    dailyPointsMade.forwardsDailyStats[selectedPoolUser.id],
                    SkaterDailyColumn,
                    getFormatedDateTitle(
                      selectedPoolUser.name,
                      "DailyPointsMadeByForwardsFor"
                    )
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Accordion
              key={`${selectedPoolUser.id}-defense`}
              type="single"
              collapsible
              defaultValue="defense"
            >
              <AccordionItem value="defense">
                <AccordionTrigger>{t("Defense")}</AccordionTrigger>
                <AccordionContent>
                  {SkatersTable(
                    dailyPointsMade.defendersDailyStats[selectedPoolUser.id],
                    SkaterDailyColumn,
                    getFormatedDateTitle(
                      selectedPoolUser.name,
                      "DailyPointsMadeByDefenseFor"
                    )
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Accordion
              key={`${selectedPoolUser.id}-goalies`}
              type="single"
              collapsible
              defaultValue="goalies"
            >
              <AccordionItem value="goalies">
                <AccordionTrigger>{t("Goalies")}</AccordionTrigger>
                <AccordionContent>
                  {GoaliesTable(
                    dailyPointsMade.goaliesDailyStats[selectedPoolUser.id],
                    getFormatedDateTitle(
                      selectedPoolUser.name,
                      "DailyPointsMadeByGoaliesFor"
                    )
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        ) : (
          <LoadingSpinner />
        )}
      </div>
      {dailyLeaders ? (
        <Tabs defaultValue="scoringLeaders">
          <TabsList>
            <TabsTrigger value={"scoringLeaders"}>
              {t("ScoringLeaders")}
            </TabsTrigger>
            <TabsTrigger value={"goaliesLeaders"}>
              {t("GoaliesLeaders")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="scoringLeaders">
            {DailyScoringLeadersTable(
              dailyLeaders.skaters,
              t("DailyScoringLeaders")
            )}
          </TabsContent>
          <TabsContent value="goaliesLeaders">
            {DailyGoaliesLeadersTable(
              dailyLeaders.goalies,
              t("DailyGoaliesLeaders")
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <LoadingSpinner />
      )}
    </div>
  );
}
