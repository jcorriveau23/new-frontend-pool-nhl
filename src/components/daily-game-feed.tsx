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
          disabled={score === null}
          variant="outline"
          size="icon"
          onClick={() => changeDate(score!.prevDate)}
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
          disabled={score === null}
          variant="outline"
          size="icon"
          onClick={() => changeDate(score!.nextDate)}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea>
        <div className="flex gap-1 mt-2 py-2">
          {score === null ? (
            <LoadingSpinner />
          ) : score.games.length > 0 ? (
            score.games.map((game) => <GameItem key={game.id} game={game} />)
          ) : (
            t("NoGameOnThatDate")
          )}
          <ScrollBar orientation="horizontal" />
        </div>
      </ScrollArea>
    </div>
  );
}
