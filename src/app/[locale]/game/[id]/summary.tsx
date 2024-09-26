import * as React from "react";
import {
  GameLanding,
  Goal,
  PeriodType,
  Linescore,
  ShootoutInfo,
  PeriodShots,
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

  const LineScoreTable = (
    linescore: Linescore,
    awayLogo: string,
    homeLogo: string
  ) => (
    <Table>
      <TableCaption>{t("ScorePerPeriod")}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-5/12">{t("Team")}</TableHead>
          {linescore.byPeriod.map((period) => (
            <TableHead key={period.periodDescriptor.number}>
              P{period.periodDescriptor.number}
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

  const ShotsPerPeriodTable = (
    shotsPerPeriod: PeriodShots[],
    awayLogo: string,
    homeLogo: string
  ) => (
    <Table>
      <TableCaption>{t("ShotsPerPeriod")}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-5/12">{t("Team")}</TableHead>
          {shotsPerPeriod.map((period) => (
            <TableHead key={period.periodDescriptor.number}>
              P{period.periodDescriptor.number}
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
          {shotsPerPeriod.map((period) => (
            <TableCell
              key={period.periodDescriptor.number}
              className="text-left"
            >
              {period.away}
            </TableCell>
          ))}
          <TableCell className="text-left">
            {shotsPerPeriod.reduce((acc, period) => acc + period.away, 0)}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="text-left">
            <Image width={30} height={30} alt="team" src={homeLogo} />
          </TableCell>
          {shotsPerPeriod.map((period) => (
            <TableCell
              key={period.periodDescriptor.number}
              className="text-left"
            >
              {period.home}
            </TableCell>
          ))}
          <TableCell className="text-left">
            {shotsPerPeriod.reduce((acc, period) => acc + period.home, 0)}
          </TableCell>
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
        {t("No game landing found with game")} {props.gameId}.
      </h1>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 p-0 sm:p-2">
      {gameLanding.summary ? (
        <>
          <div className="py-5 px-0 sm:px-5">
            {LineScoreTable(
              gameLanding.summary.linescore,
              gameLanding.awayTeam.logo,
              gameLanding.homeTeam.logo
            )}
            {ShotsPerPeriodTable(
              gameLanding.summary.shotsByPeriod,
              gameLanding.awayTeam.logo,
              gameLanding.homeTeam.logo
            )}
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
        </>
      ) : (
        <h1>TODO: Summary game preview information.</h1>
      )}
    </div>
  );
}
