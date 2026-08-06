"use client";
import React from "react";
import { ChevronRightIcon, ChevronLeftIcon } from "lucide-react";

// component
import GameItem from "./game-item";
import { useDateContext } from "@/context/date-context";
import { DatePicker } from "./ui/date-picker";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
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

  // The date of the games being displayed, as returned by the score api.
  // Parsed as local time to avoid an off-by-one day shift.
  const scoreDate = score ? new Date(score.currentDate + "T00:00:00") : null;

  return (
    <div className="m-2">
      <div className="flex items-center justify-center gap-1 text-center">
        <Button
          disabled={!score}
          variant="outline"
          size="icon"
          onClick={() => (score ? changeDate(score.prevDate) : null)}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <DatePicker
          currentDate={currentDate}
          selectedDate={selectedDate}
          fallbackDate={scoreDate}
          updateDate={updateDate}
          updateDateWithString={updateDateWithString}
        />
        <Button
          disabled={!score}
          variant="outline"
          size="icon"
          onClick={() => (score ? changeDate(score.nextDate) : null)}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
      <ScrollArea>
        <div className="mt-2 flex gap-2 py-2">
          {!score ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[74px] w-[80px] shrink-0 rounded-lg" />
            ))
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
            <p className="text-muted-foreground w-full py-8 text-center text-sm">
              {t("NoGameOnThatDate")}
            </p>
          )}
          <ScrollBar orientation="horizontal" />
        </div>
      </ScrollArea>
    </div>
  );
}
