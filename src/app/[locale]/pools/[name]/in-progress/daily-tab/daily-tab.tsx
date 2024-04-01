"use client";
import * as React from "react";
import { Pool } from "@/data/pool/model";
import {
  GamesNightStatus,
  useGamesNightContext,
} from "@/context/games-night-context";
import DailyStatsContent from "./stats-content";
import DailyPreviewContent from "./preview-content";
export interface Props {
  poolInfo: Pool;
}

export default function DailyTab(props: Props) {
  const { gamesNightStatus } = useGamesNightContext();

  switch (gamesNightStatus) {
    case GamesNightStatus.NO_GAMES: {
      return <div>No games on this date.</div>;
    }
    case GamesNightStatus.NOT_STARTED: {
      return <DailyPreviewContent poolInfo={props.poolInfo} />;
    }
    case GamesNightStatus.COMPLETED:
    case GamesNightStatus.LIVE: {
      return <DailyStatsContent poolInfo={props.poolInfo} />;
    }
  }
}
