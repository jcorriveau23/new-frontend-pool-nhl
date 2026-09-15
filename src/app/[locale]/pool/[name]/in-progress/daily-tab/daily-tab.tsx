"use client";
import * as React from "react";
import {
  GamesNightStatus,
  useGamesNightContext,
} from "@/context/games-night-context";
import DailyStatsContent from "./stats-content";
import DailyPreviewContent from "./preview-content";
import { useDateContext } from "@/context/date-context";
import { useFormatter, useTranslations } from "next-intl";
import { usePoolContext } from "@/context/pool-context";
import { PoolerUserGlobalSelector } from "@/components/pool-user-selector";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  LucideIcon,
} from "lucide-react";

interface DailyEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const DailyEmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: DailyEmptyStateProps) => (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-14 text-center">
    <div className="bg-muted rounded-full p-3">
      <Icon className="text-muted-foreground size-6" />
    </div>
    <div className="space-y-1">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        {description}
      </p>
    </div>
    {action}
  </div>
);

export default function DailyTab() {
  const { gamesNightStatus } = useGamesNightContext();
  const { currentDate, selectedDate, updateDateWithString } = useDateContext();
  const { poolInfo, dailyPointsMade } = usePoolContext();
  const t = useTranslations();
  const format = useFormatter();

  const seasonEndDate = new Date(poolInfo.season_end + "T00:00:00");
  const seasonStartDate = new Date(poolInfo.season_start + "T00:00:00");

  const dateOfInterest = dailyPointsMade
    ? new Date(dailyPointsMade.dateOfInterest + "T00:00:00")
    : (selectedDate ?? currentDate);

  const formatDate = (date: Date) =>
    format.dateTime(date, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  // List the poolers in the order of the daily ranking shown below, so the
  // selector matches the table on this tab.
  const poolerEntries = dailyPointsMade
    ? [...dailyPointsMade.totalDailyPoints]
        .sort((a, b) => b.totalPoolPoints - a.totalPoolPoints)
        .map((entry, index) => ({
          id: entry.participant,
          name: entry.participant,
          rank: index + 1,
          points: entry.totalPoolPoints,
        }))
    : undefined;

  if (dateOfInterest > seasonEndDate) {
    return (
      <DailyEmptyState
        icon={CalendarCheck}
        title={t("PoolDoneTitle")}
        description={t("PoolDone", {
          seasonEndDate: formatDate(seasonEndDate),
          selectedDate: formatDate(dateOfInterest),
        })}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateDateWithString(poolInfo.season_end)}
          >
            {t("GoToPoolLastDay")}
          </Button>
        }
      />
    );
  }

  if (dateOfInterest < seasonStartDate) {
    return (
      <DailyEmptyState
        icon={CalendarClock}
        title={t("PoolNotStartedTitle")}
        description={t("PoolNotStarted", {
          seasonStartDate: formatDate(seasonStartDate),
          selectedDate: formatDate(dateOfInterest),
        })}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateDateWithString(poolInfo.season_start)}
          >
            {t("GoToPoolFirstDay")}
          </Button>
        }
      />
    );
  }

  switch (gamesNightStatus) {
    case GamesNightStatus.NO_GAMES: {
      return (
        <DailyEmptyState
          icon={CalendarOff}
          title={t("NoGameOnThatDateTitle")}
          description={t("NoGameOnThatDateDescription", {
            selectedDate: formatDate(dateOfInterest),
          })}
        />
      );
    }
    case GamesNightStatus.NOT_STARTED:
    case GamesNightStatus.COMPLETED:
    case GamesNightStatus.LIVE: {
      return (
        <>
          <PoolerUserGlobalSelector entries={poolerEntries} />
          {poolInfo.context?.score_by_day?.[
            dailyPointsMade?.dateOfInterest ?? ""
          ] ? (
            <DailyStatsContent />
          ) : (
            <DailyPreviewContent />
          )}
        </>
      );
    }
  }
}
