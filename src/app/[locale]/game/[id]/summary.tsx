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
import { Shield } from "lucide-react";

interface Props {
  gameId: string;
}

const getServerSideGameLanding = async (gameId: string) => {
  /* 
  Query game landing for a specific game id on the server side. 
  */
  const res = await fetch(
    `https://api-web.nhle.com/v1/gamecenter/${gameId}/landing`,
    {
      next: { revalidate: 180 },
    }
  );
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data;
};

export default async function GameSummary(props: Props) {
  const gameLanding: GameLanding | null = await getServerSideGameLanding(
    props.gameId
  );
  const t = await getTranslations();

  const GoalItem = (goalInfo: Goal) => (
    <div key={goalInfo.playerId} className="flex items-center space-x-4">
      <div className="w-2/12">
        <Avatar>
          <AvatarImage src={goalInfo.headshot} />
        </Avatar>
      </div>
      <div className="w-2/12">
        <TeamLogo
          teamId={abbrevToTeamId[goalInfo.teamAbbrev.default]}
          width={30}
          height={30}
        />
      </div>
      <div className="text-left w-6/12">
        <div>
          <PlayerLink
            name={`${goalInfo.firstName.default} ${goalInfo.lastName.default} (${goalInfo.goalsToDate})`}
            id={goalInfo.playerId}
            textStyle={null}
          />
        </div>
        <div>
          {goalInfo.assists.map((assistInfo) => (
            <PlayerLink
              key={assistInfo.playerId}
              name={`${assistInfo.firstName.default} ${assistInfo.lastName.default} (${assistInfo.assistsToDate})`}
              id={assistInfo.playerId}
              textStyle={"text-sm text-muted-foreground"}
            />
          ))}
        </div>
      </div>
      <div className="text-right w-2/12">{goalInfo.timeInPeriod}</div>
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
          {TeamInfo(awayTeam.name.default, awayTeam.logo, awayTeam.sog)}
          {ScoreDisplay(awayTeam.score, homeTeam.score)}
          {TeamInfo(homeTeam.name.default, homeTeam.logo, homeTeam.sog)}
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
                          ? period.goals.map((goalInfo) => GoalItem(goalInfo))
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
