"use client";

/*
The day's scoring leaders, read for the one screen that shows them.

This was a provider mounted in the app shell, which meant every route in the
app fetched the leaders on load while exactly one component — the daily tab's
stats table — ever read them. A hook puts the read where the consumer is:
react-query is already the shared cache, so a provider bought nothing that the
query key does not, and dropping it means the fetch happens when the tab opens
rather than when the app does.

The query key and stale time are unchanged, so an entry cached by the old
provider is still a hit here.
*/

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { useDateContext } from "@/context/date-context";
import { DailyLeaders } from "@/data/dailyLeaders/model";
import { fetchDailyLeaders } from "@/lib/client-data";

export interface DailyLeadersRead {
  dailyLeaders: DailyLeaders | null | undefined;
  // Whether the read is still in flight. Without it `null` (the read failed or
  // the day has no leaders) is indistinguishable from "not here yet", which
  // leaves the tab on a skeleton that never resolves.
  isDailyLeadersPending: boolean;
}

export function useDailyLeaders(): DailyLeadersRead {
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

  return {
    dailyLeaders: query.data,
    isDailyLeadersPending: query.isPending,
  };
}
