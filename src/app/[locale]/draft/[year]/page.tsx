"use server";
import * as React from "react";

import { TeamLogo } from "@/components/team-logo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTranslations } from "next-intl/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PlayerLink from "@/components/player-link";
import { Combobox } from "@/components/ui/link-combobox";
import PageTitle from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { heightFormat } from "@/app/utils/formating";
import { getSeasonInfo, lastSeasonYear } from "@/lib/season-info";

interface Player {
  id: number;
  birthCountry: string;
  birthStateProvince: string | null;
  firstName: string;
  lastName: string;
  onRoster: string;
  position: string;
  yearsPro: number | null;
}

interface Team {
  id: number;
  commonName: string;
  fullName: string;
  logos: {
    id: number;
    background: string;
    endSeason: number;
    secureUrl: string;
    startSeason: number;
    teamId: number;
    url: string;
  }[];
  placeName: string;
  triCode: string;
}

interface FranchiseTeam {
  franchise: {
    mostRecentTeamId: number;
    teamCommonName: string;
    teamPlaceName: string;
  };
}

interface DraftProspect {
  id: number;
}

interface Data {
  id: number;
  ageInDays: number;
  ageInDaysForYear: number;
  ageInYears: number;
  amateurClubName: string;
  amateurLeague: string;
  birthDate: string;
  birthPlace: string;
  countryCode: string;
  csPlayerId: number;
  draftDate: string;
  draftMasterId: number;
  draftProspect: DraftProspect;
  draftYear: number;
  draftedByTeamId: number;
  firstName: string;
  franchiseTeam: FranchiseTeam;
  height: number;
  lastName: string;
  notes: null;
  overallPickNumber: number;
  pickInRound: number;
  player: Player;
  playerId: number;
  playerName: string;
  position: string;
  removedOutright: string;
  removedOutrightWhy: null;
  roundNumber: number;
  shootsCatches: string;
  supplementalDraft: string;
  team: Team;
  teamPickHistory: string;
  triCode: string;
  weight: number;
}

interface DraftData {
  data: Data[];
  total: number;
}

const FIRST_DRAFT_YEAR = 1963;

const getServerSideSeasonDraft = async (year: string) => {
  /*
      Query the player info of a specific player id.
      */
  const res = await fetch(
    `https://records.nhl.com/site/api/draft?include=draftProspect.id&include=player.birthStateProvince&include=player.birthCountry&include=player.position&include=player.onRoster&include=player.yearsPro&include=player.firstName&include=player.lastName&include=player.id&include=team.id&include=team.placeName&include=team.commonName&include=team.fullName&include=team.triCode&include=team.logos&include=franchiseTeam.franchise.mostRecentTeamId&include=franchiseTeam.franchise.teamCommonName&include=franchiseTeam.franchise.teamPlaceName&sort=[{"property":"overallPickNumber","direction":"ASC"}]&cayenneExp=draftYear=${year}`,
    { next: { revalidate: 86400 } } // revalidate each day
  );
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data;
};

export default async function Standing(props: {
  params: Promise<{ year: string }>;
}) {
  const params = await props.params;
  const draft: DraftData | null = await getServerSideSeasonDraft(params.year);

  const t = await getTranslations();

  const picks = draft?.data ?? [];
  const rounds = Array.from(new Set(picks.map((d) => d.roundNumber)));
  const lastDraftYear = lastSeasonYear(await getSeasonInfo());

  const getListOfYears = () => {
    const years = [];
    for (let year = lastDraftYear; year >= FIRST_DRAFT_YEAR; year--) {
      years.push(year);
    }
    return years;
  };

  // Year selector, paired with the draft totals so the header doubles as a
  // summary of what is being displayed.
  const DraftHeader = () => (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("Year")}</span>
        <Combobox
          selections={getListOfYears().map((y) => ({
            value: y.toString(),
            label: y.toString(),
          }))}
          defaultSelectedValue={params.year}
          emptyText=""
          linkTo={`/draft/\${value}`}
        />
      </div>
      {picks.length > 0 ? (
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("Rounds")}
            </p>
            <p className="font-semibold leading-tight tabular-nums">
              {rounds.length}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("Picks")}
            </p>
            <p className="font-semibold leading-tight tabular-nums">
              {picks.length}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );

  const RoundTable = (roundPicks: Data[]) => (
    // Every column stays visible at any width; the table keeps a floor width so
    // narrow screens scroll horizontally instead of squishing the cells.
    <Table className="min-w-[620px] border-t">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-8 w-10 pl-3 pr-1.5 text-right text-[11px] font-normal sm:h-9 sm:w-12 sm:pl-4 sm:pr-2 sm:text-sm">
            #
          </TableHead>
          <TableHead className="h-8 w-20 px-2 text-center text-[11px] font-normal sm:h-9 sm:w-24 sm:px-3 sm:text-sm">
            {t("T")}
          </TableHead>
          <TableHead className="h-8 px-2 text-[11px] font-normal sm:h-9 sm:px-3 sm:text-sm">
            {t("Player")}
          </TableHead>
          <TableHead className="h-8 w-14 px-2 text-center text-[11px] font-normal sm:h-9 sm:w-20 sm:px-3 sm:text-sm">
            {t("Position")}
          </TableHead>
          <TableHead className="h-8 px-2 text-[11px] font-normal sm:h-9 sm:px-3 sm:text-sm">
            {t("AmateurClub")}
          </TableHead>
          <TableHead className="h-8 w-16 px-2 text-right text-[11px] font-normal sm:h-9 sm:px-3 sm:text-sm">
            {t("Height")}
          </TableHead>
          <TableHead className="h-8 w-16 px-2 pr-3 text-right text-[11px] font-normal sm:h-9 sm:pr-4 sm:text-sm">
            {t("Weight")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roundPicks.map((d) => (
          <TableRow key={d.id} className="border-b-0 odd:bg-muted/30">
            <TableCell className="py-1.5 pl-3 pr-1.5 text-right tabular-nums text-muted-foreground sm:py-2 sm:pl-4 sm:pr-2">
              {d.overallPickNumber}
            </TableCell>
            <TableCell className="px-2 py-1.5 sm:px-3 sm:py-2">
              <div className="flex items-center justify-center gap-2">
                <TeamLogo teamId={d.draftedByTeamId} width={26} height={26} />
                <span className="text-xs font-medium text-muted-foreground">
                  {d.triCode}
                </span>
              </div>
            </TableCell>
            <TableCell className="px-2 py-1.5 sm:px-3 sm:py-2">
              {d.playerId ? (
                <PlayerLink
                  name={`${d.firstName} ${d.lastName}`}
                  id={d.playerId}
                  textStyle={null}
                />
              ) : (
                <span className="truncate">{`${d.firstName} ${d.lastName}`}</span>
              )}
            </TableCell>
            <TableCell className="px-2 py-1.5 text-center sm:px-3 sm:py-2">
              <span className="inline-flex h-5 min-w-6 items-center justify-center rounded-md border bg-muted/50 px-1.5 text-xs font-medium">
                {d.position}
              </span>
            </TableCell>
            <TableCell className="max-w-48 truncate px-2 py-1.5 sm:px-3 sm:py-2">
              <span>{d.amateurClubName}</span>
              {d.amateurLeague ? (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {d.amateurLeague}
                </span>
              ) : null}
            </TableCell>
            <TableCell className="px-2 py-1.5 text-right tabular-nums text-muted-foreground sm:px-3 sm:py-2">
              {d.height ? heightFormat(d.height) : "—"}
            </TableCell>
            <TableCell className="px-2 py-1.5 pr-3 text-right tabular-nums text-muted-foreground sm:py-2 sm:pr-4">
              {d.weight || "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const RenderRound = (round: number) => {
    const roundPicks = picks.filter((d) => d.roundNumber === round);
    const firstPick = roundPicks[0]?.overallPickNumber;
    const lastPick = roundPicks[roundPicks.length - 1]?.overallPickNumber;

    return (
      <AccordionItem
        key={round}
        value={round.toString()}
        className="border-b last:border-b-0"
      >
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold">
              {t("Round")} #{round}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {firstPick}–{lastPick}
            </span>
            <Badge
              variant="outline"
              className="px-2 py-0 text-[10px] font-normal text-muted-foreground"
            >
              {t("PickCount", { pickCount: roundPicks.length })}
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-0">
          {RoundTable(roundPicks)}
        </AccordionContent>
      </AccordionItem>
    );
  };

  if (rounds.length === 0) {
    return (
      <div className="space-y-4">
        <PageTitle
          title={t("NhlDraftHistoryPageTitle")}
          subtitle={t("DraftYearSubtitle", { year: params.year })}
        />
        <DraftHeader />
        <div className="rounded-xl border bg-card px-4 py-10 text-center text-muted-foreground">
          {t("NoDraftInfoForYear", { year: params.year })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageTitle
        title={t("NhlDraftHistoryPageTitle")}
        subtitle={t("DraftYearSubtitle", { year: params.year })}
      />
      <DraftHeader />
      {/* Only the first round is expanded by default: later rounds are long and
      rarely what someone lands on this page for. */}
      <Accordion
        defaultValue={[rounds[0].toString()]}
        className="overflow-hidden rounded-xl border bg-card"
      >
        {rounds.map((r) => RenderRound(r))}
      </Accordion>
    </div>
  );
}
