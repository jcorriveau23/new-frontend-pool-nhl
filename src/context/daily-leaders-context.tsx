"use client";

import { fetchDailyLeaders } from "@/lib/client-data";
import { DailyLeaders } from "@/data/dailyLeaders/model";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { format } from "date-fns";
import { useDateContext } from "./date-context";

interface DailyLeadersContextProps {
  dailyLeaders: DailyLeaders | null | undefined;
  // Whether the read is still in flight. Without it `null` (the read failed or
  // the day has no leaders) is indistinguishable from "not here yet", which
  // leaves the tab on a skeleton that never resolves.
  isDailyLeadersPending: boolean;
}

const DailyLeadersContext = createContext<DailyLeadersContextProps | undefined>(
  undefined,
);

export const useDailyLeadersContext = (): DailyLeadersContextProps => {
  const context = useContext(DailyLeadersContext);
  if (!context) {
    throw new Error(
      "useDailyLeadersContext must be used within a DailyLeadersProvider",
    );
  }
  return context;
};

export function DailyLeadersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { querySelectedDate, score } = useDateContext();
  // The Rust backend doesn't understand the "now" keyword (unlike the NHL
  // score API), so resolve it to a day ourselves — the same day the rest of
  // the app is showing, which is the one the nhl api calls "now". Formatting
  // the browser clock has to stay local: `toISOString` is utc, so every
  // evening in North America it asks for tomorrow, which no day has leaders
  // for yet.
  const keyDay =
    querySelectedDate === "now"
      ? (score?.currentDate ?? format(new Date(), "yyyy-MM-dd"))
      : querySelectedDate;

  const query = useQuery({
    queryKey: ["daily_leaders", keyDay],
    queryFn: () => fetchDailyLeaders(keyDay),
    staleTime: 1000 * 60 * 3, // 3 minutes in ms
  });

  const contextValue: DailyLeadersContextProps = {
    dailyLeaders: query.data,
    isDailyLeadersPending: query.isPending,
  };

  return (
    <DailyLeadersContext.Provider value={contextValue}>
      {children}
    </DailyLeadersContext.Provider>
  );
}
