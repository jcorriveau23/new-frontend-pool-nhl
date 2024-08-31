"use client";
import * as React from "react";
import {
  GamesNightStatus,
  useGamesNightContext,
} from "@/context/games-night-context";
import DailyStatsContent from "./stats-content";
import DailyPreviewContent from "./preview-content";
import { useDateContext } from "@/context/date-context";
import { useTranslations } from "next-intl";
import { usePoolContext } from "@/context/pool-context";

export default function DailyTab() {
  const { gamesNightStatus } = useGamesNightContext();
  const { currentDate, selectedDate } = useDateContext();
  const { poolInfo } = usePoolContext();
  const t = useTranslations();

  const seasonEndDate = new Date(poolInfo.season_end);
  const seasonStartDate = new Date(poolInfo.season_start);

  const dateOfInterest = selectedDate ?? currentDate;

  if (dateOfInterest > seasonEndDate) {
    return (
      <div>
        {t("PoolDone", {
          seasonEndDate: seasonEndDate.toISOString().slice(0, 10),
          selectedDate: dateOfInterest.toISOString().slice(0, 10),
        })}
      </div>
    );
  }

  if (dateOfInterest < seasonStartDate) {
    return (
      <div>
        {t("PoolNotStarted", {
          seasonStartDate: seasonStartDate.toISOString().slice(0, 10),
          selectedDate: dateOfInterest.toISOString().slice(0, 10),
        })}
      </div>
    );
  }

  switch (gamesNightStatus) {
    case GamesNightStatus.NO_GAMES: {
      return <div>{t("NoGameOnThatDate")}</div>;
    }
    case GamesNightStatus.NOT_STARTED: {
      return <DailyPreviewContent />;
    }
    case GamesNightStatus.COMPLETED:
    case GamesNightStatus.LIVE: {
      return <DailyStatsContent />;
    }
  }
}
