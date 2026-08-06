import * as React from "react";
import {
  GameLanding,
  Goal,
  Team,
  PeriodType,
  ShootoutAttempt,
  StarPlayer,
  PenaltyPeriod,
  Penalty,
} from "@/data/nhl/gameLanding";
import { abbrevToTeamId } from "@/lib/teams";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTranslations } from "next-intl/server";
import { TeamLogo } from "@/components/team-logo";
import PlayerLink from "@/components/player-link";
import { ExternalLink, Shield } from "lucide-react";
import { getServerSideGameLanding } from "@/actions/game-landing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GameInfoCard from "./game-info-card";
import GamePreview from "./game-preview";

interface Props {
  gameId: string;
}

enum GoalSituation {
  PP = "1541",
  SHG = "1451",
  EN = "1560",
}

function starInitials(name: string): string {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function GameSummary(props: Props) {
  const gameLanding: GameLanding | null = await getServerSideGameLanding(
    props.gameId
  );
  const t = await getTranslations();

  function getSituationCodeFormatedName(situationCode: GoalSituation) {
    switch (situationCode) {
      case GoalSituation.PP:
        return "PP";
      case GoalSituation.SHG:
        return "SHG";
      case GoalSituation.EN:
        return "EN";
      default:
        return "";
    }
  }

  function GoalCard({ goal }: { goal: Goal }) {
    return (
      <Card>
        <CardContent className="flex items-center space-x-4 p-4">
          <div className="grow">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <TeamLogo
                  teamId={abbrevToTeamId[goal.teamAbbrev.default]}
                  width={40}
                  height={40}
                />
                <span className="text-lg font-semibold">
                  {goal.timeInPeriod}
                </span>
              </div>
              {Object.values(GoalSituation).includes(
                goal.situationCode as GoalSituation
              ) ? (
                <Badge variant="destructive">
                  {getSituationCodeFormatedName(
                    goal.situationCode as GoalSituation
                  )}
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center space-x-2">
              <Avatar>
                <AvatarImage src={goal.headshot} />
                <AvatarFallback className="text-xs">
                  {starInitials(
                    `${goal.firstName.default} ${goal.lastName.default}`
                  )}
                </AvatarFallback>
              </Avatar>
              <span>
                <PlayerLink
                  name={`${goal.firstName.default} ${goal.lastName.default} (${goal.goalsToDate})`}
                  id={goal.playerId}
                  textStyle={null}
                />
                {goal.assists.length > 0 ? (
                  goal.assists.map((assistInfo) => (
                    <PlayerLink
                      key={assistInfo.playerId}
                      name={`${assistInfo.firstName.default} ${assistInfo.lastName.default} (${assistInfo.assistsToDate})`}
                      id={assistInfo.playerId}
                      textStyle={"text-sm text-muted-foreground"}
                    />
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t("Unassisted")}
                  </span>
                )}
              </span>
            </div>
          </div>
          <div className="flex flex-col shrink-0 gap-3">
            <span className="text-lg font-bold">
              {goal.awayScore} - {goal.homeScore}
            </span>
            {goal.highlightClipSharingUrl ? (
              <a
                href={goal.highlightClipSharingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-primary"
              >
                <ExternalLink size={16} className="mr-1" />
                {t("Watch")}
              </a>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  const PeriodGoals = (goals: Goal[]) => (
    <div className="flex flex-col gap-2">
      {goals.map((goal) => (
        <GoalCard key={`${goal.timeInPeriod}-${goal.playerId}`} goal={goal} />
      ))}
    </div>
  );

  const TeamInfo = (name: string, logo: string, shots: number) => (
    <div className="flex flex-col items-center space-y-2">
      <div className="size-16 bg-muted rounded-full flex items-center justify-center">
        <TeamLogo width={60} height={60} src={logo} />
      </div>
      <h2 className="text-lg font-semibold">{name}</h2>
      <div className="flex items-center space-x-1">
        <Shield className="size-4" />
        <span className="text-sm">
          {shots} {t("shots")}
        </span>
      </div>
    </div>
  );

  // A short status line derived from the game state (Final / OT / clock).
  const gameStatusLabel = (): string => {
    const state = gameLanding?.gameState;
    const periodType = gameLanding?.periodDescriptor?.periodType;
    if (state === "OFF" || state === "FINAL") {
      return periodType && periodType !== PeriodType.REG
        ? `${t("Final")} / ${periodType}`
        : t("Final");
    }
    if (state === "LIVE" || state === "CRIT") {
      const clock = gameLanding?.clock?.timeRemaining;
      const period = gameLanding?.periodDescriptor?.number;
      return clock && period ? `P${period} · ${clock}` : t("Live");
    }
    return "";
  };

  const ScoreDisplay = (awayScore: number, homeScore: number) => (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center bg-primary text-primary-foreground rounded-lg px-6 py-3">
        <span className="text-4xl font-bold">{awayScore}</span>
        <span className="text-2xl font-semibold mx-2">-</span>
        <span className="text-4xl font-bold">{homeScore}</span>
      </div>
      {gameStatusLabel() ? (
        <Badge variant="secondary">{gameStatusLabel()}</Badge>
      ) : null}
    </div>
  );

  const GameHeader = (awayTeam: Team, homeTeam: Team) => (
    <div className="w-full max-w-3xl mx-auto bg-background shadow-lg rounded-lg overflow-hidden">
      <div className="flex flex-col p-6 gap-6">
        <div className="flex justify-between items-center">
          {TeamInfo(awayTeam.commonName.default, awayTeam.logo, awayTeam.sog)}
          {ScoreDisplay(awayTeam.score, homeTeam.score)}
          {TeamInfo(homeTeam.commonName.default, homeTeam.logo, homeTeam.sog)}
        </div>
      </div>
    </div>
  );

  const StarCard = (star: StarPlayer) => (
    <Card key={star.playerId} className="flex-1">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="relative">
          <Avatar className="size-12">
            <AvatarImage src={star.headshot} />
            <AvatarFallback className="text-xs">
              {starInitials(star.name.default)}
            </AvatarFallback>
          </Avatar>
          <span className="bg-primary text-primary-foreground absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full text-xs font-bold">
            {star.star}
          </span>
        </div>
        <div className="min-w-0">
          <PlayerLink
            name={star.name.default}
            id={star.playerId}
            textStyle="font-medium"
          />
          <div className="text-muted-foreground text-xs">
            {star.teamAbbrev} · {star.position}
          </div>
          <div className="text-xs">
            {star.position === "G"
              ? `${star.goalsAgainstAverage?.toFixed(2) ?? "-"} ${t("Gaa")} · ${
                  star.savePctg?.toFixed(3) ?? "-"
                } ${t("SvPctg")}`
              : `${star.goals ?? 0}G · ${star.assists ?? 0}A · ${
                  star.points ?? 0
                }P`}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ThreeStars = (stars: StarPlayer[]) => (
    <div className="flex flex-col gap-3 sm:flex-row">
      {stars
        .slice()
        .sort((a, b) => a.star - b.star)
        .map((star) => StarCard(star))}
    </div>
  );

  const formatPenaltyDesc = (descKey: string) => {
    const key = `PenaltyType.${descKey}`;
    if (t.has(key)) {
      return t(key);
    }
    // Fallback for penalty types we haven't translated yet.
    return descKey
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const penaltyPlayerName = (penalty: Penalty): string => {
    if (penalty.committedByPlayer) {
      return `${penalty.committedByPlayer.firstName.default} ${penalty.committedByPlayer.lastName.default}`;
    }
    if (penalty.servedBy) {
      return `${penalty.servedBy.default} (${t("BenchPenalty")})`;
    }
    return t("BenchPenalty");
  };

  const PenaltyTable = (penaltyPeriod: PenaltyPeriod) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("Time")}</TableHead>
          <TableHead>{t("Team")}</TableHead>
          <TableHead>{t("Player")}</TableHead>
          <TableHead>{t("Infraction")}</TableHead>
          <TableHead className="text-right">{t("Duration")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {penaltyPeriod.penalties.map((penalty, index) => (
          <TableRow key={`${penalty.timeInPeriod}-${index}`}>
            <TableCell className="px-2 text-left tabular-nums">
              {penalty.timeInPeriod}
            </TableCell>
            <TableCell className="px-2">
              <TeamLogo
                teamId={abbrevToTeamId[penalty.teamAbbrev.default]}
                width={24}
                height={24}
              />
            </TableCell>
            <TableCell className="px-2 text-left whitespace-nowrap">
              {penaltyPlayerName(penalty)}
            </TableCell>
            <TableCell className="px-2 text-left">
              {formatPenaltyDesc(penalty.descKey)}
            </TableCell>
            <TableCell className="text-muted-foreground px-2 text-right tabular-nums whitespace-nowrap">
              {penalty.duration} {t("MinuteUnit")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const ShootoutTable = (shootoutInfo: ShootoutAttempt[]) => (
    <Table>
      <TableCaption>{t("ListShootoutAttempt")}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Seq.</TableHead>
          <TableHead>{t("Team")}</TableHead>
          <TableHead>{t("Shooter")}</TableHead>
          <TableHead>{t("Result")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shootoutInfo.map((attempt) => (
          <TableRow key={attempt.playerId}>
            <TableCell className="text-left">{attempt.sequence}</TableCell>
            <TableCell>
              <TeamLogo
                teamId={abbrevToTeamId[attempt.teamAbbrev?.default]}
                width={30}
                height={30}
              />
            </TableCell>
            <TableCell className="text-left">
              {attempt.firstName.default} {attempt.lastName.default}
            </TableCell>
            <TableCell className="text-left">{t(attempt.result)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (gameLanding === null) {
    return (
      <h1>
        {t("NoGameLandingFound")} {props.gameId}.
      </h1>
    );
  }

  const summary = gameLanding.summary;
  const hasPenalties = summary?.penalties?.some(
    (period) => period.penalties.length > 0
  );

  return (
    <div>
      {summary ? (
        <div className="py-5 px-0 sm:px-5">
          {GameHeader(gameLanding.awayTeam, gameLanding.homeTeam)}
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-0 pb-5 sm:px-5">
        <GameInfoCard
          startTimeUTC={gameLanding.startTimeUTC}
          venue={gameLanding.venue}
          venueLocation={gameLanding.venueLocation}
          broadcasts={gameLanding.tvBroadcasts}
          ticketsLink={gameLanding.ticketsLink}
        />
      </div>

      {summary ? (
        <div className="mx-auto max-w-3xl">
          {summary.threeStars?.length > 0 ? (
            <div className="px-0 pb-5 sm:px-5">
              <h3 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide">
                {t("ThreeStars")}
              </h3>
              {ThreeStars(summary.threeStars)}
            </div>
          ) : null}

          <div className="px-0 pb-5 sm:px-5">
            {summary.scoring
              .filter(
                (period) => period.periodDescriptor.periodType !== PeriodType.SO
              )
              .map((period) => (
                <Accordion
                  key={period.periodDescriptor.number}
                  defaultValue={["all"]}
                >
                  <AccordionItem value="all">
                    <AccordionTrigger>
                      {period.periodDescriptor.periodType === PeriodType.REG
                        ? `${t("Period")} ${period.periodDescriptor.number}`
                        : "OT"}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-4">
                        {period.goals?.length > 0
                          ? PeriodGoals(period.goals)
                          : t("NoGoal")}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}

            {summary.shootout?.events?.length > 0 ? (
              <Accordion defaultValue={["shootout"]}>
                <AccordionItem value="shootout">
                  <AccordionTrigger>{t("Shootout")}</AccordionTrigger>
                  <AccordionContent>
                    {ShootoutTable(summary.shootout.events)}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : null}

            {hasPenalties ? (
              <Accordion defaultValue={[]}>
                <AccordionItem value="penalties">
                  <AccordionTrigger>{t("Penalties")}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-4">
                      {summary.penalties
                        .filter((period) => period.penalties.length > 0)
                        .map((period) => (
                          <div key={period.periodDescriptor.number}>
                            <div className="text-muted-foreground mb-1 text-sm font-medium">
                              {period.periodDescriptor.periodType ===
                              PeriodType.REG
                                ? `${t("Period")} ${period.periodDescriptor.number}`
                                : period.periodDescriptor.periodType}
                            </div>
                            {PenaltyTable(period)}
                          </div>
                        ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : null}
          </div>
        </div>
      ) : gameLanding.matchup ? (
        <div className="px-0 pb-5 sm:px-5">
          <GamePreview
            matchup={gameLanding.matchup}
            awayTeam={gameLanding.awayTeam}
            homeTeam={gameLanding.homeTeam}
          />
        </div>
      ) : (
        <p className="text-muted-foreground py-8 text-center">
          {t("NoGamePreview")}
        </p>
      )}
    </div>
  );
}
