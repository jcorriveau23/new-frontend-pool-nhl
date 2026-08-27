// Bragging-rights tab: weekly and monthly champions, the trophy case and the
// season records, all derived client side from the pool score history.

"use client";

import * as React from "react";
import {
  Award,
  CalendarRange,
  Crown,
  Flame,
  Medal,
  Snowflake,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import InformationIcon from "@/components/information-box";
import { MonthlyPointsChart } from "@/components/chart/monthly-points-chart";
import { PoolerName } from "@/components/pooler-name";
import { usePoolContext } from "@/context/pool-context";
import { cn } from "@/lib/utils";

import { calculatePoolStats } from "../cumulative-tab/cumulative-calculation";
import {
  PeriodResult,
  RecordId,
  SeasonRecord,
  computePoolRecords,
} from "./records-calculation";

const RECORD_ICONS: Record<RecordId, React.ElementType> = {
  [RecordId.BestDay]: Zap,
  [RecordId.BestWeek]: Flame,
  [RecordId.BestMonth]: CalendarRange,
  [RecordId.BestPlayerNight]: Star,
  [RecordId.MostGoalsInADay]: Target,
  [RecordId.MostGoalieWinsInADay]: Award,
  [RecordId.LongestDailyWinStreak]: TrendingUp,
  [RecordId.ColdestDay]: Snowflake,
};

const RECORD_LABELS: Record<RecordId, string> = {
  [RecordId.BestDay]: "RecordBestDay",
  [RecordId.BestWeek]: "RecordBestWeek",
  [RecordId.BestMonth]: "RecordBestMonth",
  [RecordId.BestPlayerNight]: "RecordBestPlayerNight",
  [RecordId.MostGoalsInADay]: "RecordMostGoalsInADay",
  [RecordId.MostGoalieWinsInADay]: "RecordMostGoalieWinsInADay",
  [RecordId.LongestDailyWinStreak]: "RecordLongestDailyWinStreak",
  [RecordId.ColdestDay]: "RecordColdestDay",
};

type PeriodType = "weekly" | "monthly";

export default function RecordsTab() {
  const t = useTranslations();
  const locale = useLocale();
  const {
    poolInfo,
    poolStartDate,
    poolSelectedEndDate,
    dictUsers,
    selectedParticipant,
    updateSelectedParticipant,
    dailyPointsMade,
  } = usePoolContext();

  const [periodType, setPeriodType] = React.useState<PeriodType>("weekly");

  const { days, weeks, months, trophyCase, records } = React.useMemo(
    () => computePoolRecords(poolInfo, poolStartDate, poolSelectedEndDate),
    [poolInfo, poolStartDate, poolSelectedEndDate]
  );

  // The season standing has to come from the same computation the Cumulative
  // tab uses: it is the only one that applies the `ignore_x_worst_players`
  // setting, so anything else would contradict the official ranking.
  const seasonRanking = React.useMemo(
    () =>
      calculatePoolStats(
        poolInfo,
        poolStartDate,
        poolSelectedEndDate,
        dailyPointsMade
      )[1] ?? [],
    [poolInfo, poolStartDate, poolSelectedEndDate, dailyPointsMade]
  );

  const nameOf = (participantId: string) =>
    dictUsers[participantId]?.name ?? participantId;

  const formatDay = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });

  const formatMonth = (monthKey: string) =>
    new Date(`${monthKey}-01T00:00:00`).toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });

  // Records carry either a single day or a "start → end" range.
  const formatRecordDate = (dateLabel: string) =>
    dateLabel
      .split(" → ")
      .map(formatDay)
      .join(" → ");

  const formatDayRange = (period: PeriodResult) =>
    `${formatDay(period.start)} → ${formatDay(period.end)}`;

  const formatPeriod = (period: PeriodResult) =>
    periodType === "monthly" ? formatMonth(period.key) : formatDayRange(period);

  if (days.length === 0) {
    return (
      <Alert>
        <Trophy className="size-4" />
        <AlertTitle>{t("NoRecordsYet")}</AlertTitle>
        <AlertDescription>{t("NoRecordsYetDescription")}</AlertDescription>
      </Alert>
    );
  }

  const seasonLeader = seasonRanking[0] ?? null;
  const seasonRunnerUp = seasonRanking[1] ?? null;
  const currentWeek = weeks[weeks.length - 1] ?? null;
  const currentMonth = months[months.length - 1] ?? null;
  const bestDay = records.find((record) => record.id === RecordId.BestDay);

  const HighlightCard = ({
    icon: Icon,
    title,
    name,
    points,
    subtitle,
  }: {
    icon: React.ElementType;
    title: string;
    name: string | null;
    points: number | null;
    subtitle: string;
  }) => (
    <Card className="text-left">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardDescription>
        <CardTitle className="truncate text-xl">{name ?? "—"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="text-2xl font-semibold tabular-nums">
          {points === null ? "—" : t("PointsValue", { points })}
        </div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </CardContent>
    </Card>
  );

  const RecordRow = ({ record }: { record: SeasonRecord }) => {
    const Icon = RECORD_ICONS[record.id];

    return (
      <TableRow>
        <TableCell className="w-10">
          <Icon className="size-4 text-muted-foreground" />
        </TableCell>
        <TableCell className="text-left">
          <div className="font-medium">{t(RECORD_LABELS[record.id])}</div>
          <div className="text-xs text-muted-foreground">
            {formatRecordDate(record.dateLabel)}
            {record.detail ? ` · ${record.detail}` : null}
          </div>
        </TableCell>
        <TableCell className="text-left">{nameOf(record.participantId)}</TableCell>
        <TableCell className="text-right tabular-nums font-semibold">
          {record.value}
        </TableCell>
      </TableRow>
    );
  };

  const periods = periodType === "monthly" ? months : weeks;

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HighlightCard
          icon={Crown}
          title={t("SeasonLeader")}
          name={seasonLeader?.participant ?? null}
          points={seasonLeader?.getTotalPoolPoints() ?? null}
          subtitle={
            seasonLeader && seasonRunnerUp
              ? t("PointsAheadOfRunnerUp", {
                  points:
                    seasonLeader.getTotalPoolPoints() -
                    seasonRunnerUp.getTotalPoolPoints(),
                  name: seasonRunnerUp.participant,
                })
              : t("NoContenderYet")
          }
        />
        <HighlightCard
          icon={Flame}
          title={t("PoolerOfTheWeek")}
          name={
            currentWeek?.standings[0]
              ? nameOf(currentWeek.standings[0].participantId)
              : null
          }
          points={currentWeek?.standings[0]?.poolPoints ?? null}
          subtitle={currentWeek ? formatDayRange(currentWeek) : "—"}
        />
        <HighlightCard
          icon={CalendarRange}
          title={t("PoolerOfTheMonth")}
          name={
            currentMonth?.standings[0]
              ? nameOf(currentMonth.standings[0].participantId)
              : null
          }
          points={currentMonth?.standings[0]?.poolPoints ?? null}
          subtitle={currentMonth ? formatMonth(currentMonth.key) : "—"}
        />
        <HighlightCard
          icon={Zap}
          title={t("BestSingleDay")}
          name={bestDay ? nameOf(bestDay.participantId) : null}
          points={bestDay?.value ?? null}
          subtitle={bestDay ? formatRecordDate(bestDay.dateLabel) : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="size-5" />
            {t("TrophyCase")}
            <InformationIcon text={t("RecordsMethodology")} />
          </CardTitle>
          <CardDescription>{t("TrophyCaseDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Pooler")}</TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <Medal className="size-4" />
                      {t("MonthsWon")}
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <Trophy className="size-4" />
                      {t("WeeksWon")}
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <Zap className="size-4" />
                      {t("DaysWon")}
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trophyCase.map((entry) => (
                  <TableRow
                    key={entry.participantId}
                    className={cn(
                      "cursor-pointer",
                      nameOf(entry.participantId) === selectedParticipant &&
                        "bg-selection hover:bg-selection font-semibold border-l-4 border-l-primary"
                    )}
                    onClick={() =>
                      updateSelectedParticipant(nameOf(entry.participantId))
                    }
                  >
                    <TableCell>
                      <PoolerName name={nameOf(entry.participantId)} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.monthsWon}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.weeksWon}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.daysWon}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("PeriodChampions")}</CardTitle>
          <CardDescription>{t("PeriodChampionsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ToggleGroup
            className="justify-start"
            value={[periodType]}
            onValueChange={(value: string[]) => {
              // Single-select group: ignore the deselect that leaves it empty.
              if (value[0] === "weekly" || value[0] === "monthly") {
                setPeriodType(value[0]);
              }
            }}
          >
            <ToggleGroupItem value="weekly" variant="outline">
              {t("Weekly")}
            </ToggleGroupItem>
            <ToggleGroupItem value="monthly" variant="outline">
              {t("Monthly")}
            </ToggleGroupItem>
          </ToggleGroup>
          <ScrollArea className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Period")}</TableHead>
                  <TableHead>{t("Champion")}</TableHead>
                  <TableHead>{t("Margin")}</TableHead>
                  <TableHead className="text-right">
                    {selectedParticipant}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...periods].reverse().map((period) => {
                  const champion = period.standings[0] ?? null;
                  const runnerUp = period.standings[1] ?? null;
                  const selectedIndex = period.standings.findIndex(
                    (standing) =>
                      nameOf(standing.participantId) === selectedParticipant
                  );
                  const selected =
                    selectedIndex >= 0 ? period.standings[selectedIndex] : null;

                  // A break in the schedule leaves everyone at zero: there is
                  // no champion to crown for that period.
                  if (!champion || champion.poolPoints <= 0) {
                    return (
                      <TableRow key={period.key} className="text-muted-foreground">
                        <TableCell className="whitespace-nowrap">
                          {formatPeriod(period)}
                        </TableCell>
                        <TableCell colSpan={3} className="italic">
                          {t("NoPointsInPeriod")}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const isSelectedChampion =
                    nameOf(champion.participantId) === selectedParticipant;

                  return (
                    <TableRow key={period.key}>
                      <TableCell className="whitespace-nowrap">
                        {formatPeriod(period)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <Trophy className="size-4 text-muted-foreground" />
                          <span className="font-medium">
                            {nameOf(champion.participantId)}
                          </span>
                          <span className="tabular-nums font-semibold">
                            {champion.poolPoints}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {runnerUp
                          ? champion.poolPoints === runnerUp.poolPoints
                            ? t("TiedWith", {
                                name: nameOf(runnerUp.participantId),
                              })
                            : t("MarginOver", {
                                points:
                                  champion.poolPoints - runnerUp.poolPoints,
                                name: nameOf(runnerUp.participantId),
                              })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {isSelectedChampion ? (
                          <Trophy className="ml-auto size-4" />
                        ) : selected ? (
                          <Badge variant="secondary" className="tabular-nums">
                            {`#${selectedIndex + 1} · −${
                              champion.poolPoints - selected.poolPoints
                            }`}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("PointsPerMonth")}</CardTitle>
          <CardDescription>{t("PointsPerMonthDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyPointsChart months={months} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Medal className="size-5" />
            {t("SeasonRecords")}
          </CardTitle>
          <CardDescription>{t("SeasonRecordsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="p-0">
            <Table>
              <TableBody>
                {records.map((record) => (
                  <RecordRow key={record.id} record={record} />
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
