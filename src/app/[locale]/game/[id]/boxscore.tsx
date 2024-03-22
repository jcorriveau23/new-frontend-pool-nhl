import * as React from "react";
import {
  GameBoxScore,
  SkaterStats,
  GoalieStats,
} from "@/data/nhl/gameBoxScore";

import { DataTable } from "@/components/ui/data-table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Image from "next/image";

import { getTranslations } from "next-intl/server";
import { skaterColumns, goalieColumns } from "./boxscore-columns";

interface Props {
  gameId: string;
}

export const getServerSideBoxScore = async (gameId: string) => {
  /* 
  Query game boxscore for a specific game id on the server side. 
  */
  const res = await fetch(
    `http://192.168.0.75/api-rust/game/boxscore/${gameId}`
  );
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data;
};

export default async function GameBoxscore(props: Props) {
  const boxscore: GameBoxScore | null = await getServerSideBoxScore(
    props.gameId
  );

  const t = await getTranslations();
  if (boxscore == null) {
    return (
      <h1>
        {t("No game landing found with game")} {props.gameId}.
      </h1>
    );
  }

  const SkaterTable = (skaters: SkaterStats[]) => (
    <DataTable
      data={skaters}
      columns={skaterColumns}
      initialState={{ columnPinning: { left: ["player"] } }}
    />
  );

  const GoalieTable = (goalies: GoalieStats[]) => (
    <DataTable
      data={goalies}
      columns={goalieColumns}
      initialState={{ columnPinning: { left: ["player"] } }}
    />
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2">
      <Accordion type="single" collapsible defaultValue="all">
        <AccordionItem value="all">
          <AccordionTrigger>
            <Image
              width={50}
              height={50}
              alt="home-team"
              src={boxscore.awayTeam.logo}
            />
          </AccordionTrigger>
          <AccordionContent>
            {SkaterTable(boxscore.boxscore.playerByGameStats.awayTeam.forwards)}
            {SkaterTable(boxscore.boxscore.playerByGameStats.awayTeam.defense)}
            {GoalieTable(boxscore.boxscore.playerByGameStats.awayTeam.goalies)}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Accordion type="single" collapsible defaultValue="all">
        <AccordionItem value="all">
          <AccordionTrigger>
            <Image
              width={50}
              height={50}
              alt="home-team"
              src={boxscore.homeTeam.logo}
            />
          </AccordionTrigger>

          <AccordionContent>
            {SkaterTable(boxscore.boxscore.playerByGameStats.homeTeam.forwards)}
            {SkaterTable(boxscore.boxscore.playerByGameStats.homeTeam.defense)}
            {GoalieTable(boxscore.boxscore.playerByGameStats.homeTeam.goalies)}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
