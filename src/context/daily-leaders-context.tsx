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

  const query = useQuery({
    queryKey: ["daily_leaders", querySelectedDate],
    queryFn: () => {
      return getServerSideDailyLeaders(querySelectedDate);
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
