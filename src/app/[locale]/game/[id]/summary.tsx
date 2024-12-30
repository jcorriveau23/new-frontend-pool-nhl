import * as React from "react";
import {
  GameLanding,
  Goal,
  Team,
  PeriodType,
  ShootoutAttempt,
} from "@/data/nhl/gameLanding";
import { abbrevToTeamId } from "@/lib/teams";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
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

interface Props {
  gameId: string;
}

enum GoalSituation {
  PP = "1541",
  SHG = "1451",
  EN = "1560",
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
          <div className="flex-shrink-0">
            <TeamLogo
              teamId={abbrevToTeamId[goal.teamAbbrev.default]}
              width={40}
              height={40}
            />
          </div>
          <div className="flex-grow">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">{goal.timeInPeriod}</span>
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
          <div className="flex-shrink-0 space-y-3">
            <span className="text-lg font-bold">
              {goal.awayScore} - {goal.homeScore}
            </span>
            <a
              href={goal.highlightClipSharingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-link"
            >
              <ExternalLink size={16} className="mr-1" />
              {t("Watch")}
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  const PeriodGoals = (period: number, goals: Goal[]) => (
    <div className="space-y-2">
      {goals.map((goal) => (
        <GoalCard key={goal.timeInPeriod} goal={goal} />
      ))}
    </div>
  );

  const TeamInfo = (name: string, logo: string, shots: number) => (
    <div className="flex flex-col items-center space-y-2">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
        <Image width={60} height={60} alt="team" src={logo} />
      </div>
      <h2 className="text-lg font-semibold">{name}</h2>
      <div className="flex items-center space-x-1">
        <Shield className="w-4 h-4" />
        <span className="text-sm">
          {shots} {t("shots")}
        </span>
      </div>
    </div>
  );

  const ScoreDisplay = (awayScore: number, homeScore: number) => (
    <div className="flex items-center justify-center bg-primary text-primary-foreground rounded-lg px-6 py-3">
      <span className="text-4xl font-bold">{awayScore}</span>
      <span className="text-2xl font-semibold mx-2">-</span>
      <span className="text-4xl font-bold">{homeScore}</span>
    </div>
  );

  const GameSummary = (awayTeam: Team, homeTeam: Team) => (
    <div className="w-full max-w-3xl mx-auto bg-background shadow-lg rounded-lg overflow-hidden">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          {TeamInfo(awayTeam.commonName.default, awayTeam.logo, awayTeam.sog)}
          {ScoreDisplay(awayTeam.score, homeTeam.score)}
          {TeamInfo(homeTeam.commonName.default, homeTeam.logo, homeTeam.sog)}
        </div>
      </div>
    </div>
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
                teamId={abbrevToTeamId[attempt.teamAbbrev]}
                width={30}
                height={30}
              />
            </TableCell>
            <TableCell className="text-left">
              {attempt.firstName} {attempt.lastName}
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

  return (
    <div>
      {gameLanding.summary ? (
        <>
          <div className="py-5 px-0 sm:px-5">
            {GameSummary(gameLanding.awayTeam, gameLanding.homeTeam)}
          </div>
          <div className="py-5 px-0 sm:px-5">
            {gameLanding.summary.scoring
              .filter(
                (period) => period.periodDescriptor.periodType !== PeriodType.SO
              )
              .map((period) => (
                <Accordion
                  key={period.periodDescriptor.number}
                  type="single"
                  collapsible
                  defaultValue="all"
                >
                  <AccordionItem value="all">
                    <AccordionTrigger>
                      {period.periodDescriptor.periodType === PeriodType.REG
                        ? `${t("Period")} ${period.periodDescriptor.number}`
                        : "OT"}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        {period.goals?.length > 0
                          ? PeriodGoals(
                              period.periodDescriptor.number,
                              period.goals
                            )
                          : t("NoGoal")}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            {gameLanding.summary.shootout?.length > 0 ? (
              <Accordion type="single" collapsible defaultValue="shootout">
                <AccordionItem value="shootout">
                  <AccordionTrigger>{t("Shootout")}</AccordionTrigger>
                  <AccordionContent>
                    {ShootoutTable(gameLanding.summary.shootout)}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : null}
          </div>
        </>
      ) : (
        <h1>TODO: Summary game preview information.</h1>
      )}
    </div>
  );
}
