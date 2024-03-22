import * as React from "react";
import {
  GameLanding,
  Goal,
  PeriodType,
  Linescore,
  ShootoutInfo,
} from "@/data/nhl/gameLanding";
import { team_info, abbrevToTeamId } from "@/lib/teams";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/navigation";
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

interface Props {
  gameId: string;
}

export const getServerSideGameLanding = async (gameId: string) => {
  /* 
  Query game landing for a specific game id on the server side. 
  */
  const res = await fetch(
    `http://192.168.0.75/api-rust/game/landing/${gameId}`
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
    <div key={goalInfo.timeInPeriod} className="flex items-center space-x-4">
      <div>
        <Avatar>
          <AvatarImage src={goalInfo.headshot} />
        </Avatar>
      </div>
      <div>
        <Image
          width={30}
          height={30}
          alt="team"
          src={team_info[abbrevToTeamId[goalInfo.teamAbbrev.default]].logo}
        />
      </div>
      <div className="text-left">
        <div>
          <Link href="/" className="text-sm font-medium leading-none">
            {`${goalInfo.firstName.default} ${goalInfo.lastName.default} (${goalInfo.goalsToDate})`}
          </Link>
        </div>
        <div>
          {goalInfo.assists.map((assistInfo) => (
            <Link
              key={assistInfo.playerId}
              href="/"
              className="text-sm text-muted-foreground"
            >
              {assistInfo.firstName.default} {assistInfo.lastName.default} (
              {assistInfo.assistsToDate})
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  const LineScoreTable = (
    linescore: Linescore,
    awayLogo: string,
    homeLogo: string
  ) => (
    <Table>
      <TableCaption>{t("Score per period table")}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>{t("Team")}</TableHead>
          {linescore.byPeriod.map((period) => (
            <TableHead key={period.periodDescriptor.number}>
              P.{period.periodDescriptor.number}
            </TableHead>
          ))}
          <TableHead>{t("Total")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="text-left">
            <Image width={30} height={30} alt="team" src={awayLogo} />
          </TableCell>
          {linescore.byPeriod.map((periodScore) => (
            <TableCell
              key={periodScore.periodDescriptor.number}
              className="text-left"
            >
              {periodScore.away}
            </TableCell>
          ))}
          <TableCell className="text-left">{linescore.totals.away}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="text-left">
            <Image width={30} height={30} alt="team" src={homeLogo} />
          </TableCell>
          {linescore.byPeriod.map((periodScore) => (
            <TableCell
              key={periodScore.periodDescriptor.number}
              className="text-left"
            >
              {periodScore.home}
            </TableCell>
          ))}
          <TableCell className="text-left">{linescore.totals.home}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  const ShootoutTable = (shootoutInfo: ShootoutInfo[]) => (
    <Table>
      <TableCaption>{t("The list of shootout attempt")}</TableCaption>
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
              <Image
                width={30}
                height={30}
                alt="team"
                src={team_info[abbrevToTeamId[attempt.teamAbbrev]].logo}
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
        {t("No game landing found with game")} {props.gameId}.
      </h1>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2">
      <div>
        {LineScoreTable(
          gameLanding.summary.linescore,
          gameLanding.awayTeam.logo,
          gameLanding.homeTeam.logo
        )}
      </div>
      <div>
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
                      : t("No goal")}
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
    </div>
  );
}
