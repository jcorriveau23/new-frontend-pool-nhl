/*
Waiver claims and recorded lineup changes in the History tab.

The tab otherwise reads roster changes off the daily lineups, which only tell
that a player came or went — not that the two halves of a waiver claim belong
together, and not what day the pool actually has on record for the change.

Both of the pool's own logs are added here instead. Every claim is in
`roster_transactions`, so each one is listed on its own, on the day it applies
to, and taken out of the anonymous movements so the same swap is not shown
twice. Every lineup change is in `lineup_events`, which is not a report of what
happened but the thing the scoring reads — so those are listed with their date,
which is what makes a date filed wrong visible and fixable.
*/
import { LineupEvent, RosterTransaction, Trade } from "@/data/pool/model";

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
  // Everything that changed on a date: roster movements, trades, waivers and
  // the lineup changes the pool has on record for it.
  date: string;
  dailyMovements: DailyMovements[];
  dailyTrades: Trade[];
  dailyWaivers: RosterTransaction[];
  dailyLineupEvents: LineupEventChange[];
}

/*
One recorded lineup change, with what it moved.

An event holds a whole lineup, and fifteen names say far less than the two that
changed — so it is shown against the participant's previous event, the same way
the derived movements are shown.
*/
export interface LineupEventChange {
  event: LineupEvent;
  addedPlayerIds: string[];
  removedPlayerIds: string[];
  /*
  The first event a participant has: the lineup the pool opens with, left by the
  last pick of the draft.

  It has no previous lineup to differ from, so there is nothing to list as
  added or removed. It is also the one event that cannot be dropped or moved
  later without leaving the pooler unscored until their next change, which the
  backend refuses — so the UI does not offer it.
  */
  isOpening: boolean;
}

const isEmpty = (day: DailyHistory) =>
  day.dailyMovements.length === 0 &&
  day.dailyTrades.length === 0 &&
  day.dailyWaivers.length === 0 &&
  day.dailyLineupEvents.length === 0;

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
        dailyLineupEvents: [...day.dailyLineupEvents],
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
        dailyLineupEvents: [],
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

/*
Each recorded lineup change, paired with what it moved.

The events of one participant are read in date order so each can be shown
against the one before it. Participants are independent: a change to one says
nothing about another's lineup.
*/
export function lineupEventChanges(events: LineupEvent[]): LineupEventChange[] {
  const byParticipant = new Map<string, LineupEvent[]>();
  for (const event of events) {
    const own = byParticipant.get(event.participant) ?? [];
    own.push(event);
    byParticipant.set(event.participant, own);
  }

  const changes: LineupEventChange[] = [];

  for (const own of byParticipant.values()) {
    const inOrder = [...own].sort((a, b) =>
      a.effective_date.localeCompare(b.effective_date),
    );

    inOrder.forEach((event, index) => {
      const previous = inOrder[index - 1];
      const lineupOf = (of: LineupEvent) =>
        [...of.forwards, ...of.defense, ...of.goalies].map(String);
      const now = lineupOf(event);
      const before = previous === undefined ? [] : lineupOf(previous);

      changes.push({
        event,
        // Nothing to compare the opening lineup against, so it is listed as
        // the lineup the pool starts from rather than as a change.
        addedPlayerIds:
          previous === undefined
            ? []
            : now.filter((id) => !before.includes(id)),
        removedPlayerIds:
          previous === undefined
            ? []
            : before.filter((id) => !now.includes(id)),
        isOpening: previous === undefined,
      });
    });
  }

  return changes;
}

/*
`history` with each recorded lineup change added to the day it takes effect on.

A participant's derived movements for that day are dropped: the event is the
same change seen from the side the scoring actually reads, and listing both
would show one change twice — the same reason a waiver claim takes its two
players out of the movements.

`participantName` maps a participant id to the name the movements are keyed by.
*/
export function addLineupEventsToHistory(
  history: DailyHistory[],
  events: LineupEvent[],
  participantName: (participantId: string) => string,
): DailyHistory[] {
  const days = new Map(
    history.map((day) => [
      day.date,
      {
        ...day,
        dailyMovements: [...day.dailyMovements],
        dailyLineupEvents: [...day.dailyLineupEvents],
      },
    ]),
  );

  for (const change of lineupEventChanges(events)) {
    const date = change.event.effective_date;
    let day = days.get(date);

    if (day === undefined) {
      day = {
        date,
        dailyMovements: [],
        dailyTrades: [],
        dailyWaivers: [],
        dailyLineupEvents: [],
      };
      days.set(date, day);
    }

    day.dailyLineupEvents.push(change);

    const name = participantName(change.event.participant);
    day.dailyMovements = day.dailyMovements.filter(
      (movements) => movements.participant !== name,
    );
  }

  return [...days.values()].filter((day) => !isEmpty(day)).sort(byMostRecent);
}
