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
          icon: <Radio className="text-destructive size-3.5 animate-pulse" />,
          label: "Live",
          description:
            querySelectedDate === "now"
              ? t("LivePointsNow")
              : t("LivePoints", {
                  selectedDate: querySelectedDate,
                }),
          color: "bg-destructive",
        };
      case GamesNightStatus.COMPLETED:
        return {
          icon: <Lock className="text-primary size-3.5" />,
          label: "Completed",
          description:
            querySelectedDate === "now"
              ? t("CumulatedPointsNow")
              : t("CumulatedPoints", {
                  selectedDate: querySelectedDate,
                }),
          color: "bg-primary",
        };
      case GamesNightStatus.NOT_STARTED:
        return {
          icon: <AlertCircle className="text-chart-4 size-3.5" />,
          label: "Not Started",
          description:
            querySelectedDate === "now"
              ? t("FuturePointsNow")
              : t("FuturePoints", {
                  selectedDate: querySelectedDate,
                }),
          color: "bg-chart-4",
        };
      case GamesNightStatus.NO_GAMES:
        return {
          icon: <CalendarX className="text-muted-foreground size-3.5" />,
          label: "No Games",
          description:
            querySelectedDate === "now"
              ? t("NoGamesNow")
              : t("NoGames", {
                  selectedDate: querySelectedDate,
                }),
          color: "bg-muted-foreground",
        };
    }
  };

  const stateDetails = getStateDetails(state);

  return (
    <Popover>
      <PopoverTrigger
        nativeButton={false}
        render={
          <div
            className="relative inline-block cursor-pointer"
            aria-label={`Game status: ${stateDetails.label}`}
          />
        }
      >
        {stateDetails.icon}
        <span
          className={`absolute -top-0.5 -right-0.5 block size-1.5 rounded-full ${stateDetails.color} ring-background ring-2`}
        />
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <div className="flex flex-col gap-2">
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
