import * as React from "react";
import {
  GameBoxScore,
  SkaterStats,
  GoalieStats,
} from "@/data/nhl/gameBoxScore";

import { DataTable } from "@/components/ui/data-table";
import Image from "next/image";

import { getTranslations } from "next-intl/server";
import { skaterColumns, goalieColumns } from "./boxscore-columns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  gameId: string;
}

export const getServerSideBoxScore = async (gameId: string) => {
  /* 
  Query game boxscore for a specific game id on the server side. 
  */
  const res = await fetch(
    `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`,
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

export default async function GameBoxscore(props: Props) {
  const boxscore: GameBoxScore | null = await getServerSideBoxScore(
    props.gameId
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
      meta={null}
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
      meta={null}
      title={title}
      tableFooter={null}
    />
  );

  return (
    <div className="py-5 px-0 sm:px-5">
      {boxscore.playerByGameStats ? (
        <Tabs defaultValue="awayTeam">
          <TabsList>
            <TabsTrigger value="awayTeam">
              <Image
                width={30}
                height={30}
                alt="home-team"
                src={boxscore.awayTeam.logo}
              />
              {t("AwayTeam")}
            </TabsTrigger>
            <TabsTrigger value="homeTeam">
              <Image
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
              t("ForwardsStats")
            )}
            {SkaterTable(
              boxscore.playerByGameStats.awayTeam.defense,
              t("DefensesStats")
            )}
            {GoalieTable(
              boxscore.playerByGameStats.awayTeam.goalies,
              t("GoaliesStats")
            )}
          </TabsContent>
          <TabsContent value="homeTeam">
            {SkaterTable(
              boxscore.playerByGameStats.homeTeam.forwards,
              t("ForwardsStats")
            )}
            {SkaterTable(
              boxscore.playerByGameStats.homeTeam.defense,
              t("DefensesStats")
            )}
            {GoalieTable(
              boxscore.playerByGameStats.homeTeam.goalies,
              t("GoaliesStats")
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <h1>TODO: Boxscore game preview information.</h1>
      )}
    </div>
  );
}
