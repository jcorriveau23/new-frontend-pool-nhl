"use client";
import React, { useEffect } from "react";
import { ChevronRightIcon, ChevronLeftIcon } from "@radix-ui/react-icons";

// component
import { Game } from "@/data/nhl/game";
import GameItem from "./game-item";
import { useDateContext } from "@/context/date-context";
import { useGamesNightContext } from "@/context/games-night-context";
import { DatePicker } from "./ui/date-picker";
import { format } from "date-fns";
import { Button } from "./ui/button";
import { LoadingSpinner } from "./ui/loading-spinner";
import { useTranslations } from "next-intl";
import { getServerSideDailyGames } from "@/actions/daily-games";

export default function DailyGameFeed() {
  const t = useTranslations();

  const { currentDate, selectedDate, updateDate } = useDateContext();
  const [gamesStats, setGamesStats] = React.useState<Game[] | null>(null);
  const { updateGamesNightContext } = useGamesNightContext();

  useEffect(() => {
    const getServerActionGames = async () => {
      const games = await getServerSideDailyGames(
        format(selectedDate, "yyyy-MM-dd")
      );
      updateGamesNightContext(games);
      setGamesStats(games);
    };

    getServerActionGames();
  }, [selectedDate]);

  const changeDate = (difference: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + difference);
    setGamesStats(null);
    return newDate;
  };

  return (
    <div className="m-2">
      <div className="flex items-center justify-center gap-1 text-center">
        <Button
          variant="outline"
          size="icon"
          onClick={() => updateDate(changeDate(-1))}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <DatePicker
          currentDate={currentDate}
          selectedDate={selectedDate}
          updateDate={updateDate}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => updateDate(changeDate(1))}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex overflow-auto gap-1 mt-2 py-2">
        {gamesStats === null ? (
          <LoadingSpinner />
        ) : gamesStats.length > 0 ? (
          gamesStats.map((game) => <GameItem key={game.id} game={game} />)
        ) : (
          t("NoGameOnThatDate")
        )}
      </div>
    </div>
  );
}
