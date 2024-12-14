"use client";
/*
Module that share the context of the current date, the selected date 
and allow to update the selected date across the whole application.
*/
import { getServerSideDailyGames } from "@/actions/daily-games";
import { useRouter, usePathname } from "@/i18n/routing";
import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { Score } from "../data/nhl/game";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

interface DateContextProps {
  currentDate: Date;
  selectedDate: Date | null;
  querySelectedDate: string;
  score: Score | null | undefined;
  updateDate: (newDate: Date | null) => void;
  updateDateWithString: (newDate: string) => void;
}

const DateContext = createContext<DateContextProps | undefined>(undefined);

export const useDateContext = (): DateContextProps => {
  const context = useContext(DateContext);
  if (!context) {
    throw new Error("useDateContext must be used within a DateProvider");
  }
  return context;
};

interface DateProviderProps {
  children: ReactNode;
}

export const DateProvider: React.FC<DateProviderProps> = ({ children }) => {
  const router = useRouter();
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const querySelectedDate = searchParams.get("selectedDate") ?? "now";
  const currentParams = new URLSearchParams(searchParams.toString());
  const currentDate = new Date();

  // The default selected date is the one returned by the /now endpoint of the nhl api.
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  // Update the selected date based on the query parameter.
  useEffect(() => {
    if (querySelectedDate) {
      const parsedDate = new Date(querySelectedDate + "T00:00:00");
      if (!isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate);
      }
    }
  }, []);

  const query = useQuery({
    queryKey: ["daily_games", querySelectedDate],
    queryFn: () => {
      return getServerSideDailyGames(querySelectedDate);
    },
    staleTime: 1000 * 60 * 3, // 3 minutes in ms
  });

  const updateDate = (newDate: Date | null) => {
    setSelectedDate(newDate);
    // Optionally update the URL to reflect the new selected date
    if (newDate === null) {
      currentParams.delete("selectedDate");
    } else {
      currentParams.set("selectedDate", newDate.toISOString().split("T")[0]);
    }

    router.push(`${pathName}?${currentParams.toString()}`);
  };

  function parseDate(dateString: string): Date {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const updateDateWithString = (newDate: string) => {
    const selectedDate = newDate === "now" ? new Date() : parseDate(newDate);

    setSelectedDate(selectedDate);
    // Optionally update the URL to reflect the new selected date
    currentParams.set("selectedDate", newDate);

    router.push(`${pathName}?${currentParams.toString()}`);
  };

  const contextValue: DateContextProps = {
    currentDate,
    selectedDate,
    querySelectedDate,
    score: query.data,
    updateDate,
    updateDateWithString,
  };

  return (
    <DateContext.Provider value={contextValue}>{children}</DateContext.Provider>
  );
};
