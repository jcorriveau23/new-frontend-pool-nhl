/*
Waiver claims in the History tab.

The tab otherwise reads roster changes off the daily lineups, which only tell
that a player came or went — not that the two halves of a waiver claim belong
together. The pool keeps every claim in `roster_transactions`, so each one is
listed on its own, on the day it applies to, and taken out of the anonymous
movements so the same swap is not shown twice.
*/
import { RosterTransaction, Trade } from "@/data/pool/model";

// The bucket for changes made to the current roster that no scored day has
// picked up yet.
export const TODAY = "Today";

export interface DailyMovements {
  // Daily movements for a specific date and pooler, keyed by the pooler's name.
  participant: string;
  addedPlayerIds: string[];
  removedPlayerIds: string[];
}

export interface DailyHistory {
  // Everything that changed on a date: roster movements, trades and waivers.
  date: string;
  dailyMovements: DailyMovements[];
  dailyTrades: Trade[];
  dailyWaivers: RosterTransaction[];
}

const isEmpty = (day: DailyHistory) =>
  day.dailyMovements.length === 0 &&
  day.dailyTrades.length === 0 &&
  day.dailyWaivers.length === 0;

// Today first, then the most recent day down.
const byMostRecent = (a: DailyHistory, b: DailyHistory) =>
  a.date === TODAY ? -1 : b.date === TODAY ? 1 : b.date.localeCompare(a.date);

/*
`history` with each waiver claim added to the day it applies to.

A claim's two players are removed from the lineup movements of its pooler on
that day and in the Today bucket — whichever of the two picked the change up.
`participantName` maps a participant id to the name the movements are keyed by.
*/
export function addWaiversToHistory(
  history: DailyHistory[],
  transactions: RosterTransaction[],
  participantName: (participantId: string) => string,
): DailyHistory[] {
  const days = new Map(
    history.map((day) => [
      day.date,
      {
        ...day,
        dailyMovements: [...day.dailyMovements],
        dailyWaivers: [...day.dailyWaivers],
      },
    ]),
  );

  const byFilingOrder = [...transactions].sort(
    (a, b) => a.date_created - b.date_created,
  );

  for (const transaction of byFilingOrder) {
    let day = days.get(transaction.effective_date);
    if (day === undefined) {
      day = {
        date: transaction.effective_date,
        dailyMovements: [],
        dailyTrades: [],
        dailyWaivers: [],
      };
      days.set(day.date, day);
    }
    day.dailyWaivers.push(transaction);

    const name = participantName(transaction.participant);
    const dropped = transaction.dropped_player_id.toString();
    const added = transaction.added_player_id.toString();

    for (const affected of [day, days.get(TODAY)]) {
      if (affected === undefined) continue;
      affected.dailyMovements = affected.dailyMovements
        .map((movements) =>
          movements.participant === name
            ? {
                ...movements,
                addedPlayerIds: movements.addedPlayerIds.filter(
                  (id) => id !== added,
                ),
                removedPlayerIds: movements.removedPlayerIds.filter(
                  (id) => id !== dropped,
                ),
              }
            : movements,
        )
        .filter(
          (movements) =>
            movements.addedPlayerIds.length > 0 ||
            movements.removedPlayerIds.length > 0,
        );
    }
  }

  return [...days.values()].filter((day) => !isEmpty(day)).sort(byMostRecent);
}
