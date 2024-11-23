"use client";
import React from "react";
import { ChevronRightIcon, ChevronLeftIcon } from "@radix-ui/react-icons";

// component
import GameItem from "./game-item";
import { useDateContext } from "@/context/date-context";
import { DatePicker } from "./ui/date-picker";
import { Button } from "./ui/button";
import { LoadingSpinner } from "./ui/loading-spinner";
import { useTranslations } from "next-intl";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { GameState } from "@/data/nhl/game";

export default function DailyGameFeed() {
  const t = useTranslations();

  const { score, currentDate, selectedDate, updateDate, updateDateWithString } =
    useDateContext();

  const changeDate = (newDate: string) => {
    updateDateWithString(newDate);
  };

  return (
    <div className="m-2">
      <div className="flex items-center justify-center gap-1 text-center">
        <Button
          disabled={!score}
          variant="outline"
          size="icon"
          onClick={() => (score ? changeDate(score.prevDate) : null)}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <DatePicker
          currentDate={currentDate}
          selectedDate={selectedDate}
          updateDate={updateDate}
          updateDateWithString={updateDateWithString}
        />
        <Button
          disabled={!score}
          variant="outline"
          size="icon"
          onClick={() => (score ? changeDate(score.nextDate) : null)}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea>
        <div className="flex gap-1 mt-2 py-2">
          {!score ? (
            <LoadingSpinner />
          ) : score.games.length > 0 ? (
            score.games
              .sort((a, b) => {
                const moveToEnd = [GameState.OFF, GameState.FINAL];

                const isAEnd = moveToEnd.includes(a.gameState);
                const isBEnd = moveToEnd.includes(b.gameState);

                if (isAEnd && !isBEnd) return 1; // `a` should go after `b`
                if (!isAEnd && isBEnd) return -1; // `b` should go after `a`
                return 0; // Keep original order if both or neither are in the `moveToEnd` array
              })
              .map((game) => <GameItem key={game.id} game={game} />)
          ) : (
            t("NoGameOnThatDate")
          )}
          <ScrollBar orientation="horizontal" />
        </div>
      </ScrollArea>
    </div>
  );
}
