"use client";

import { getServerSideDailyLeaders } from "@/actions/daily-leaders";
import { DailyLeaders } from "@/data/dailyLeaders/model";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { useDateContext } from "./date-context";

interface DailyLeadersContextProps {
  dailyLeaders: DailyLeaders | null | undefined;
}

const DailyLeadersContext = createContext<DailyLeadersContextProps | undefined>(
  undefined
);

export const useDailyLeadersContext = (): DailyLeadersContextProps => {
  const context = useContext(DailyLeadersContext);
  if (!context) {
    throw new Error(
      "useDailyLeadersContext must be used within a DailyLeadersProvider"
    );
  }
  return context;
};

export function DailyLeadersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { querySelectedDate } = useDateContext();
  // The Rust backend doesn't understand the "now" keyword (unlike the NHL
  // score API), so resolve it to today's date before querying.
  const keyDay =
    querySelectedDate === "now"
      ? new Date().toISOString().split("T")[0]
      : querySelectedDate;

  const query = useQuery({
    queryKey: ["daily_leaders", keyDay],
    queryFn: () => {
      return getServerSideDailyLeaders(keyDay);
    },
    staleTime: 1000 * 60 * 3, // 3 minutes in ms
  });

  const contextValue: DailyLeadersContextProps = {
    dailyLeaders: query.data,
  };

  return (
    <DailyLeadersContext.Provider value={contextValue}>
      {children}
    </DailyLeadersContext.Provider>
  );
}
