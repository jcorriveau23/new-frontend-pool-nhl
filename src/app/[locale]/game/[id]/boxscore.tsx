import * as React from "react";
import {
  GameBoxScore,
  SkaterStats,
  GoalieStats,
} from "@/data/nhl/gameBoxScore";
import {
  GameLanding,
  SkaterSeasonStat,
  GoalieSeasonStat,
} from "@/data/nhl/gameLanding";

import { DataTable } from "@/components/ui/data-table";
import { TeamLogo } from "@/components/team-logo";

import { getTranslations } from "next-intl/server";
import { skaterColumns, goalieColumns } from "./boxscore-columns";
import {
  skaterSeasonColumns,
  goalieSeasonColumns,
} from "./season-stats-columns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerSideBoxScore } from "@/actions/game-boxscore";
import { getServerSideGameLanding } from "@/actions/game-landing";

interface Props {
  gameId: string;
}

export default async function GameBoxscore(props: Props) {
  const boxscore: GameBoxScore | null = await getServerSideBoxScore(
    props.gameId,
  );

  const t = await getTranslations();
  if (boxscore == null) {
    return (
      <h1>
        {t("NoBoxscoreFound")} {props.gameId}.
      </h1>
    );
  }

  const SkaterTable = (skaters: SkaterStats[], title: string) => (
    <DataTable
      data={skaters}
      columns={skaterColumns}
      initialState={{
        columnPinning: { left: ["player"] },
        sorting: [
          {
            id: "points",
            desc: true,
          },
        ],
      }}
      meta={undefined}
      title={title}
      tableFooter={null}
    />
  );

  const GoalieTable = (goalies: GoalieStats[], title: string) => (
    <DataTable
      data={goalies}
      columns={goalieColumns}
      initialState={{
        columnPinning: { left: ["player"] },
        sorting: [
          {
            id: "toi",
            desc: true,
          },
        ],
      }}
      meta={undefined}
      title={title}
      tableFooter={null}
    />
  );

  if (boxscore.playerByGameStats) {
    return (
      <div className="py-5 px-0 sm:px-5">
        <Tabs defaultValue="awayTeam">
          <TabsList>
            <TabsTrigger value="awayTeam">
              <TeamLogo
                width={30}
                height={30}
                alt="away-team"
                src={boxscore.awayTeam.logo}
              />
              {t("AwayTeam")}
            </TabsTrigger>
            <TabsTrigger value="homeTeam">
              <TeamLogo
                width={30}
                height={30}
                alt="home-team"
                src={boxscore.homeTeam.logo}
              />
              {t("HomeTeam")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="awayTeam">
            {SkaterTable(
              boxscore.playerByGameStats.awayTeam.forwards,
              t("ForwardsStats"),
            )}
            {SkaterTable(
              boxscore.playerByGameStats.awayTeam.defense,
              t("DefensesStats"),
            )}
            {GoalieTable(
              boxscore.playerByGameStats.awayTeam.goalies,
              t("GoaliesStats"),
            )}
          </TabsContent>
          <TabsContent value="homeTeam">
            {SkaterTable(
              boxscore.playerByGameStats.homeTeam.forwards,
              t("ForwardsStats"),
            )}
            {SkaterTable(
              boxscore.playerByGameStats.homeTeam.defense,
              t("DefensesStats"),
            )}
            {GoalieTable(
              boxscore.playerByGameStats.homeTeam.goalies,
              t("GoaliesStats"),
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Pre-game: no per-game stats yet. Fall back to season stats from the
  // landing "matchup" data so the box score tab is still useful.
  const gameLanding: GameLanding | null = await getServerSideGameLanding(
    props.gameId,
  );
  const seasonSkaters = gameLanding?.matchup?.skaterSeasonStats?.skaters ?? [];
  const seasonGoalies = gameLanding?.matchup?.goalieSeasonStats?.goalies ?? [];

  if (seasonSkaters.length === 0 && seasonGoalies.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        {t("NoBoxscorePreview")}
      </p>
    );
  }

  const byTeam = <T extends { teamId: number }>(rows: T[], teamId: number) =>
    rows.filter((row) => row.teamId === teamId);

  const SeasonSkaterTable = (skaters: SkaterSeasonStat[]) => (
    <DataTable
      data={skaters}
      columns={skaterSeasonColumns}
      initialState={{
        columnPinning: { left: ["player"] },
        sorting: [{ id: "points", desc: true }],
      }}
      meta={undefined}
      title={t("SeasonSkaterStats")}
      tableFooter={null}
    />
  );

  const SeasonGoalieTable = (goalies: GoalieSeasonStat[]) => (
    <DataTable
      data={goalies}
      columns={goalieSeasonColumns}
      initialState={{
        columnPinning: { left: ["player"] },
        sorting: [{ id: "gamesPlayed", desc: true }],
      }}
      meta={undefined}
      title={t("SeasonGoalieStats")}
      tableFooter={null}
    />
  );

  const TeamSeasonStats = (teamId: number) => (
    <>
      {SeasonSkaterTable(byTeam(seasonSkaters, teamId))}
      {SeasonGoalieTable(byTeam(seasonGoalies, teamId))}
    </>
  );

  return (
    <div className="py-5 px-0 sm:px-5">
      <p className="text-muted-foreground mb-4 text-center text-sm">
        {t("BoxscorePreviewNote")}
      </p>
      <Tabs defaultValue="awayTeam">
        <TabsList>
          <TabsTrigger value="awayTeam">
            <TeamLogo
              width={30}
              height={30}
              alt="away-team"
              src={boxscore.awayTeam.logo}
            />
            {t("AwayTeam")}
          </TabsTrigger>
          <TabsTrigger value="homeTeam">
            <TeamLogo
              width={30}
              height={30}
              alt="home-team"
              src={boxscore.homeTeam.logo}
            />
            {t("HomeTeam")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="awayTeam">
          {TeamSeasonStats(boxscore.awayTeam.id)}
        </TabsContent>
        <TabsContent value="homeTeam">
          {TeamSeasonStats(boxscore.homeTeam.id)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
