"use client";

import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertCircle, Lock, Radio, CalendarX } from "lucide-react";
import { GamesNightStatus } from "@/context/games-night-context";
import { useTranslations } from "next-intl";
import { useDateContext } from "@/context/date-context";

interface StatePopoverProps {
  state: GamesNightStatus;
}

export function GameStatePopover({ state }: StatePopoverProps) {
  const t = useTranslations();
  const { querySelectedDate } = useDateContext();

  const getStateDetails = (state: GamesNightStatus) => {
    switch (state) {
      case GamesNightStatus.LIVE:
        return {
          icon: <Radio className="h-4 w-4 text-red-500 animate-pulse" />,
          label: "Live",
          description: t("LivePoints", {
            selectedDate: querySelectedDate,
          }),
          color: "bg-red-500",
        };
      case GamesNightStatus.COMPLETED:
        return {
          icon: <Lock className="h-4 w-4 text-blue-500" />,
          label: "Completed",
          description: t("CumulatedPoints", {
            selectedDate: querySelectedDate,
          }),
          color: "bg-blue-500",
        };
      case GamesNightStatus.NOT_STARTED:
        return {
          icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
          label: "Not Started",
          description: t("FuturePoints", {
            selectedDate: querySelectedDate,
          }),
          color: "bg-yellow-500",
        };
      case GamesNightStatus.NO_GAMES:
        return {
          icon: <CalendarX className="h-4 w-4 text-gray-500" />,
          label: "No Games",
          description: t("NoGames", {
            selectedDate: querySelectedDate,
          }),
          color: "bg-gray-500",
        };
    }
  };

  const stateDetails = getStateDetails(state);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className="relative inline-block cursor-pointer"
          aria-label={`Game status: ${stateDetails.label}`}
        >
          {stateDetails.icon}
          <span
            className={`absolute -top-1 -right-1 block h-2 w-2 rounded-full ${stateDetails.color} ring-1 ring-white`}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <div className="flex flex-col space-y-2">
          <p className="text-sm font-medium leading-none">
            {stateDetails.label}
          </p>
          <p className="text-xs text-muted-foreground">
            {stateDetails.description}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
