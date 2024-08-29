import React from "react";

// component
import { Score } from "@/data/nhl/game";
import GameItem from "./game-item";
// import { useGamesNightContext } from "@/context/games-night-context";
import { DatePicker } from "./ui/date-picker";
import { format } from "date-fns";
import { LoadingSpinner } from "./ui/loading-spinner";
import { getTranslations } from "next-intl/server";
import NextDateButton from "./next-date";
import { DatePickerContext } from "@/context/date-context";

const getServerSidedailyGames = async (selectedDate: string) => {
  /* 
    Query the the list of games for a current date.
  */
  const res = await fetch(
    `https://api-web.nhle.com/v1/score/${selectedDate}`,
    { next: { revalidate: 180 } } // revalidate each day
  );
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data;
};

export default async function NavigationBar({
  params,
}: {
  params: { selectedDate: string };
}) {
  const score: Score = await getServerSidedailyGames(params.selectedDate);
  const t = await getTranslations();

  // const { updateGamesNightContext } = useGamesNightContext();

  return (
    <div className="m-2">
      <div className="flex items-center justify-center gap-1 text-center">
        <NextDateButton previous={true} date={score.prevDate} />
        <DatePickerContext />
        <NextDateButton previous={false} date={score.nextDate} />
      </div>
      <div className="flex overflow-auto gap-1 mt-2 py-2">
        {score.games === null ? (
          <LoadingSpinner />
        ) : score.games.length > 0 ? (
          score.games.map((game) => (
            <GameItem
              key={game.id}
              game={game}
              selectedDate={params.selectedDate}
            />
          ))
        ) : (
          t("NoGameOnThatDate")
        )}
      </div>
    </div>
  );
}
