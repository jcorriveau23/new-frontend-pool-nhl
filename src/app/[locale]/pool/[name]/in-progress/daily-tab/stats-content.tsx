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
import { usePoolContext } from "@/context/pool-context";
import {
  GoalieDailyInfo,
  GoaliesDailyTotalPoints,
  SkaterDailyInfo,
  SkatersDailyTotalPoints,
  TotalDailyPoints,
} from "@/lib/scoring";
import { Row } from "@tanstack/react-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useDailyLeadersContext } from "@/context/daily-leaders-context";
import { GameStatePopover } from "@/components/game-state-popover";
import { GamesNightStatus } from "@/context/games-night-context";

/*
Pool point settings carry fractions (half a point per assist, and so on), so a
sum lands on values like 2.8000000000000003. Trim that noise without forcing
decimals onto the whole numbers most pools produce.
*/
const formatPoints = (points: number) => Number(points.toFixed(3));

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
  const { dailyLeaders, isDailyLeadersPending } = useDailyLeadersContext();

  /*
  The daily ranking already carries the selected pooler's per-position totals,
  so the footer rows and the section headers below read them from there rather
  than summing the same players a second time. Keyed by name, not by id: that
  is what `TotalDailyPoints` carries as its participant.
  */
  const selectedUserTotals = dailyPointsMade?.totalDailyPoints.find(
    (entry) => entry.participant === selectedPoolUser.name,
  );

  const SkatersTable = (
    skaters: SkaterDailyInfo[],
    columns: ColumnDef<SkaterDailyInfo>[],
    total: SkatersDailyTotalPoints | undefined,
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
        columnPinning: { left: ["player"], right: ["poolPoints"] },
      }}
      meta={{
        props: poolInfo,
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={null}
      tableFooter={null}
      footerCells={
        total
          ? {
              player: <span className="font-semibold">{t("Total")}</span>,
              goals: total.goals,
              assists: total.assists,
              shootoutGoals: total.shootoutGoals,
              poolPoints: (
                <span className="font-semibold">
                  {formatPoints(total.totalPoolPoints)}
                </span>
              ),
            }
          : null
      }
    />
  );

  const GoaliesTable = (
    goalies: GoalieDailyInfo[],
    total: GoaliesDailyTotalPoints | undefined,
  ) => (
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
        columnPinning: { left: ["player"], right: ["poolPoints"] },
      }}
      meta={{
        props: poolInfo,
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={null}
      tableFooter={null}
      footerCells={
        total
          ? {
              player: <span className="font-semibold">{t("Total")}</span>,
              goals: total.goals,
              assists: total.assists,
              poolPoints: (
                <span className="font-semibold">
                  {formatPoints(total.totalPoolPoints)}
                </span>
              ),
            }
          : null
      }
    />
  );

  /*
  The section stays worth reading while collapsed: the games played and the
  points the position brought in are the two numbers the table below is opened
  for, so they sit in the header next to the position name.
  */
  const PositionSection = (
    value: string,
    label: string,
    total: SkatersDailyTotalPoints | GoaliesDailyTotalPoints | undefined,
    table: React.ReactNode,
  ) => (
    <AccordionItem value={value} className="border-b-0">
      <AccordionTrigger className="py-2 font-semibold hover:no-underline">
        <span className="flex items-center gap-2">
          {label}
          {total ? (
            <span className="text-xs font-normal tabular-nums text-muted-foreground">
              {total.numberOfGame} {t("GP")}
              <span className="ml-2 font-semibold text-foreground">
                {formatPoints(total.totalPoolPoints)} {t("Pts")}
              </span>
            </span>
          ) : null}
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-2">{table}</AccordionContent>
    </AccordionItem>
  );

  const TotalDailyRankTable = (
    totalDailyPoints: TotalDailyPoints[],
    columns: ColumnDef<TotalDailyPoints>[],
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
            return "bg-selection hover:bg-selection group-hover:bg-selection font-semibold border-l-4 border-l-primary";
          }
        },
        onRowClick: (row: Row<TotalDailyPoints>) => {
          updateSelectedParticipant(row.original.participant);
        },
        t: t,
      }}
      rowClickable
      title={null}
      tableFooter={null}
    />
  );

  const DailyScoringLeadersTable = (skaters: DailySkater[]) => (
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
      title={null}
      tableFooter={null}
    />
  );

  const DailyGoaliesLeadersTable = (goalies: DailyGoalie[]) => (
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
      title={null}
      tableFooter={null}
    />
  );

  return (
    <div className="space-y-6 py-4">
      <div>
        {dailyPointsMade ? (
          <Tabs defaultValue="totalRanking">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <GameStatePopover
                state={
                  dailyPointsMade.cumulated
                    ? GamesNightStatus.COMPLETED
                    : GamesNightStatus.LIVE
                }
              />
              <TabsList>
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
              )}
            </TabsContent>
            <TabsContent value="forwardRanking">
              {TotalDailyRankTable(
                dailyPointsMade.totalDailyPoints,
                ForwardsDailyTotalColumn,
              )}
            </TabsContent>
            <TabsContent value="defenseRanking">
              {TotalDailyRankTable(
                dailyPointsMade.totalDailyPoints,
                DefensesDailyTotalColumn,
              )}
            </TabsContent>
            <TabsContent value="goaliesRanking">
              {TotalDailyRankTable(
                dailyPointsMade.totalDailyPoints,
                GoaliesDailyTotalColumn,
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <TableSkeleton />
        )}
      </div>
      <div>
        {dailyPointsMade ? (
          <Accordion
            key={selectedPoolUser.id}
            multiple
            defaultValue={["forwards", "defense", "goalies"]}
            className="flex flex-col gap-2"
          >
            {PositionSection(
              "forwards",
              t("Forwards"),
              selectedUserTotals?.forwards,
              SkatersTable(
                dailyPointsMade.forwardsDailyStats[selectedPoolUser.id],
                SkaterDailyColumn,
                selectedUserTotals?.forwards,
              ),
            )}
            {PositionSection(
              "defense",
              t("Defense"),
              selectedUserTotals?.defense,
              SkatersTable(
                dailyPointsMade.defendersDailyStats[selectedPoolUser.id],
                SkaterDailyColumn,
                selectedUserTotals?.defense,
              ),
            )}
            {PositionSection(
              "goalies",
              t("Goalies"),
              selectedUserTotals?.goalies,
              GoaliesTable(
                dailyPointsMade.goaliesDailyStats[selectedPoolUser.id],
                selectedUserTotals?.goalies,
              ),
            )}
          </Accordion>
        ) : (
          <TableSkeleton />
        )}
      </div>
      {!dailyLeaders ? (
        // A finished read with nothing in it is not a load that is still
        // going: saying so beats a skeleton that sits there forever.
        isDailyLeadersPending ? (
          <TableSkeleton label={t("DailyScoringLeaders")} />
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed px-6 py-10 text-center text-sm">
            {t("DailyLeadersUnavailable")}
          </p>
        )
      ) : (
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
            {DailyScoringLeadersTable(dailyLeaders.skaters)}
          </TabsContent>
          <TabsContent value="goaliesLeaders">
            {DailyGoaliesLeadersTable(dailyLeaders.goalies)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
