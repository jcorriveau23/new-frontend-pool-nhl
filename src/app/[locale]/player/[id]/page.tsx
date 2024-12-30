import * as React from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "@/i18n/routing";
import PageTitle from "@/components/page-title";
import PlayerPointsTable, { GoalieNhlInfo, SkaterNhlInfo } from "./columns";
import { ageFormat, heightFormat } from "@/app/utils/formating";

enum SeasonType {
  SEASON = 2,
  PLAYOFF = 3,
}

const getServerSidePlayerInfo = async (playerId: string) => {
  /* 
    Query the player info of a specific player id. 
    */
  const res = await fetch(
    `https://api-web.nhle.com/v1/player/${playerId}/landing`,
    { next: { revalidate: 21600 } } // revalidate each 6 hours
  );
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data;
};

export default async function Player(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<string[][] | Record<string, string> | string>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const queryString = new URLSearchParams(searchParams).toString();
  const t = await getTranslations();
  const playerInfo: GoalieNhlInfo | SkaterNhlInfo =
    await getServerSidePlayerInfo(params.id);

  const PlayerBaseInfo = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <div className="flex flex-row">
              <Avatar>
                <AvatarImage src={playerInfo.headshot} />
              </Avatar>
              <Image
                width={60}
                height={60}
                alt="team"
                src={playerInfo.teamLogo}
              />
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="text-left">{t("Position")}</TableCell>
          <TableCell className="text-left">{playerInfo.position}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="text-left">{t("BirthCity")}</TableCell>
          <TableCell className="text-left">
            {`${playerInfo.birthCity?.default}, ${playerInfo.birthStateProvince?.default}, ${playerInfo?.birthCountry}`}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="text-left">{t("BirthDate")}</TableCell>
          <TableCell className="text-left">
            {`${playerInfo.birthDate} (${ageFormat(playerInfo.birthDate)})`}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="text-left">{t("Height")}</TableCell>
          <TableCell className="text-left">
            {heightFormat(playerInfo.heightInInches)}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="text-left">{t("Weight")}</TableCell>
          <TableCell className="text-left">
            {playerInfo.weightInPounds}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="text-left">{t("Drafted")}</TableCell>
          <TableCell className="text-left">
            {playerInfo.draftDetails ? (
              <Link
                className="text-link hover:underline"
                href={`/draft/${playerInfo.draftDetails.year}?${queryString}`}
              >
                {t("DraftDetail", {
                  pick: playerInfo.draftDetails.pickInRound,
                  round: playerInfo.draftDetails.round,
                  team: playerInfo.draftDetails.teamAbbrev,
                  year: playerInfo.draftDetails.year,
                })}
              </Link>
            ) : (
              t("NotDrafted")
            )}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
  return (
    <div className="items-center text-center">
      <PageTitle
        title={`${playerInfo.firstName.default} ${playerInfo.lastName.default}`}
      />
      {PlayerBaseInfo()}
      <Accordion type="single" collapsible defaultValue="regularSeason">
        <AccordionItem value="regularSeason">
          <AccordionTrigger>{t("RegularSeason")}</AccordionTrigger>
          <AccordionContent>
            <PlayerPointsTable
              playerInfo={playerInfo}
              seasonType={SeasonType.SEASON}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Accordion type="single" collapsible defaultValue="playoff">
        <AccordionItem value="playoff">
          <AccordionTrigger>{t("Playoff")}</AccordionTrigger>
          <AccordionContent>
            <PlayerPointsTable
              playerInfo={playerInfo}
              seasonType={SeasonType.PLAYOFF}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
