"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import {
  Matchup,
  MatchupPlayer,
  GoalieComparisonPlayer,
  GoalieTeamTotals,
  Team,
} from "@/data/nhl/gameLanding";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamLogo } from "@/components/team-logo";
import PlayerLink from "@/components/player-link";

interface Props {
  matchup: Matchup;
  awayTeam: Team;
  homeTeam: Team;
}

function initials(name: string): string {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function GamePreview({ matchup, awayTeam, homeTeam }: Props) {
  const t = useTranslations();

  const categoryLabel = (category: string): string => {
    switch (category) {
      case "points":
        return t("P");
      case "goals":
        return t("G");
      case "assists":
        return t("A");
      default:
        return category;
    }
  };

  const PlayerCell = ({
    player,
    align,
  }: {
    player: MatchupPlayer;
    align: "left" | "right";
  }) => (
    <div
      className={`flex items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <Avatar className="size-9">
        <AvatarImage src={player.headshot} />
        <AvatarFallback className="text-xs">
          {initials(player.name.default)}
        </AvatarFallback>
      </Avatar>
      <div className={align === "right" ? "items-end" : ""}>
        <PlayerLink
          name={player.name.default}
          id={player.playerId}
          textStyle="text-sm font-medium"
        />
        <div className="text-muted-foreground text-xs">
          #{player.sweaterNumber} · {player.positionCode}
        </div>
      </div>
    </div>
  );

  const ComparisonBar = ({
    away,
    home,
  }: {
    away: number;
    home: number;
  }) => {
    const total = away + home;
    const awayPct = total > 0 ? (away / total) * 100 : 50;
    return (
      <div className="bg-muted flex h-1.5 w-full overflow-hidden rounded-full">
        <div className="bg-primary" style={{ width: `${awayPct}%` }} />
        <div className="bg-primary/40" style={{ width: `${100 - awayPct}%` }} />
      </div>
    );
  };

  const TeamHeader = ({ team, record }: { team: Team; record?: string }) => (
    <div className="flex flex-col items-center gap-1">
      <TeamLogo src={team.logo} width={48} height={48} />
      <span className="text-sm font-semibold">{team.commonName.default}</span>
      {record ? (
        <span className="text-muted-foreground text-xs">{record}</span>
      ) : null}
    </div>
  );

  const GoalieTeamCard = ({
    team,
    goalie,
    totals,
  }: {
    team: Team;
    goalie?: GoalieComparisonPlayer;
    totals?: GoalieTeamTotals;
  }) => (
    <Card className="flex-1">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <TeamLogo src={team.logo} width={24} height={24} />
          <span className="text-sm font-semibold">
            {team.commonName.default}
          </span>
        </div>
        {goalie ? (
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarImage src={goalie.headshot} />
              <AvatarFallback className="text-xs">
                {initials(goalie.name.default)}
              </AvatarFallback>
            </Avatar>
            <div>
              <PlayerLink
                name={goalie.name.default}
                id={goalie.playerId}
                textStyle="font-medium"
              />
              <div className="text-muted-foreground text-xs">
                {goalie.record} · {goalie.gaa.toFixed(2)} {t("Gaa")} ·{" "}
                {goalie.savePctg.toFixed(3)} {t("SvPctg")}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">
            {t("NoData")}
          </span>
        )}
        {totals ? (
          <div className="text-muted-foreground grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs">
            <div>
              <div className="text-foreground font-semibold">{totals.gaa.toFixed(2)}</div>
              {t("Gaa")}
            </div>
            <div>
              <div className="text-foreground font-semibold">
                {totals.savePctg.toFixed(3)}
              </div>
              {t("SvPctg")}
            </div>
            <div>
              <div className="text-foreground font-semibold">
                {totals.shutouts}
              </div>
              {t("Shutouts")}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const goalieAway = matchup.goalieComparison?.awayTeam;
  const goalieHome = matchup.goalieComparison?.homeTeam;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Matchup banner */}
      <div className="flex items-center justify-around">
        <TeamHeader team={awayTeam} record={goalieAway?.teamTotals?.record} />
        <span className="text-muted-foreground text-lg font-semibold">
          {t("Versus")}
        </span>
        <TeamHeader team={homeTeam} record={goalieHome?.teamTotals?.record} />
      </div>

      {/* Skater leaders comparison */}
      {matchup.skaterComparison?.leaders?.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-center text-sm font-semibold uppercase tracking-wide">
            {t("TeamLeaders")}
          </h3>
          {matchup.skaterComparison.leaders.map((leader) => (
            <Card key={leader.category}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <PlayerCell player={leader.awayLeader} align="left" />
                  <span className="text-muted-foreground text-xs font-semibold uppercase">
                    {categoryLabel(leader.category)}
                  </span>
                  <PlayerCell player={leader.homeLeader} align="right" />
                </div>
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                  <span className="w-8 text-left text-lg font-bold tabular-nums">
                    {leader.awayLeader.value}
                  </span>
                  <ComparisonBar
                    away={leader.awayLeader.value}
                    home={leader.homeLeader.value}
                  />
                  <span className="w-8 text-right text-lg font-bold tabular-nums">
                    {leader.homeLeader.value}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Goalie comparison */}
      {goalieAway || goalieHome ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-center text-sm font-semibold uppercase tracking-wide">
            {t("Goaltending")}
          </h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            <GoalieTeamCard
              team={awayTeam}
              goalie={goalieAway?.leaders?.[0]}
              totals={goalieAway?.teamTotals}
            />
            <GoalieTeamCard
              team={homeTeam}
              goalie={goalieHome?.leaders?.[0]}
              totals={goalieHome?.teamTotals}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
