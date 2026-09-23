/*
Rules deciding whether a pooler may still swap a player for a free agent.

They mirror the backend `drop_add_player` validation (budget, effective date,
season range) so the UI can tell the pooler what is going to happen — and how
much of their budget is left — before it hits the endpoint, instead of only
reporting the error that comes back.
*/
import { DropPeriod, Player, Pool, PoolerRoster } from "@/data/pool/model";
import {
  getEffectiveRosterDate,
  ROSTER_MODIFICATION_CUTOFF_HOUR,
} from "./roster-modification";

// The cutoff is the same one a lineup change uses: past noon the day's games
// are already under way, so a swap is counted for the next day. Re-exported so
// callers do not have to know that free agency borrows it.
export { ROSTER_MODIFICATION_CUTOFF_HOUR as DROP_CUTOFF_HOUR };

export interface DropBudget {
  // Whether the pool has free agency at all.
  isEnabled: boolean;
  // Day a swap filed now would take effect ("YYYY-MM-DD").
  effectiveDate: string;
  // Swaps already counted against the budget the effective date falls in.
  used: number;
  // Swaps allowed per period. 0 when the pool has no free agency.
  max: number;
  remaining: number;
  period: DropPeriod | null;
  // Whether a swap filed now would be accepted: free agency is on, the pool is
  // running, the budget has room and the effective date is still in the season.
  canDrop: boolean;
  // Why not, when `canDrop` is false and the reason is worth telling apart from
  // "the pool has no free agency".
  isSeasonOver: boolean;
}

// The calendar month a date falls in, as its "YYYY-MM" prefix. Dates are ISO,
// so this is a slice rather than a parse.
const monthOf = (date: string): string => date.slice(0, 7);

/*
The state of `participantId`'s drop budget as of now.

The budget is counted on the transactions' effective dates, not on when they
were filed: a swap filed on the last day of a month for the first of the next
one spends the next month's budget, which is the month it actually applies to.
*/
export const getDropBudget = (
  pool: Pool,
  participantId: string,
  now: Date,
): DropBudget => {
  // An API that predates free agency leaves the key out altogether, so the
  // absent case is undefined as often as it is null.
  const settings = pool.settings.player_drop_settings ?? null;
  // A swap made before opening night has no day of its own to apply to, so the
  // backend lands it on the season start; the budget is counted there too.
  const filedDate = getEffectiveRosterDate(now);
  const effectiveDate =
    filedDate < pool.season_start ? pool.season_start : filedDate;

  if (settings === null) {
    return {
      isEnabled: false,
      effectiveDate,
      used: 0,
      max: 0,
      remaining: 0,
      period: null,
      canDrop: false,
      isSeasonOver: false,
    };
  }

  const transactions = pool.context?.roster_transactions ?? [];
  const used = transactions.filter(
    (transaction) =>
      transaction.participant === participantId &&
      (settings.period === DropPeriod.SEASON ||
        monthOf(transaction.effective_date) === monthOf(effectiveDate)),
  ).length;

  const remaining = Math.max(settings.max_drops - used, 0);
  const isSeasonOver = effectiveDate > pool.season_end;

  return {
    isEnabled: true,
    effectiveDate,
    used,
    max: settings.max_drops,
    remaining,
    period: settings.period,
    canDrop: remaining > 0 && !isSeasonOver,
    isSeasonOver,
  };
};

/*
Whether `player` is a free agent: in no pooler's roster of this pool.

`playersOwner` is the pool context's player-to-owner map, which the pool
context already keeps up to date — a player it does not name is undrafted.
*/
export const isFreeAgent = (
  player: Player,
  playersOwner: Record<number, string>,
): boolean => playersOwner[player.id] === undefined;

/*
Whether the incoming player could start, cap-wise, once the dropped one is off
the roster.

Mirrors the backend rule: a player with no contract can never start in a pool
that counts the cap, and the freed salary is part of what the incoming player
is measured against.
*/
const fitsUnderCap = (
  pool: Pool,
  roster: PoolerRoster,
  droppedPlayerId: number,
  addedPlayer: Player,
): boolean => {
  const teamSalaryCap = pool.settings.salary_cap;
  if (teamSalaryCap === null) {
    return true;
  }
  if (addedPlayer.salary_cap === null) {
    return false;
  }

  const players = pool.context?.players ?? {};
  const startersSalary = [
    ...roster.chosen_forwards,
    ...roster.chosen_defenders,
    ...roster.chosen_goalies,
  ]
    .filter((playerId) => playerId !== droppedPlayerId)
    .reduce(
      (total, playerId) =>
        total + (players[playerId.toString()]?.salary_cap ?? 0),
      0,
    );

  return startersSalary + addedPlayer.salary_cap <= teamSalaryCap;
};

/*
Where the picked up player would land, so the UI can warn before the swap
rather than after it.

Mirrors the backend placement: the freed spot is taken when the incoming
player's position has room and the cap allows it, otherwise they go to the
bench — and a full bench refuses the swap outright.
*/
export const getSwapLanding = (
  pool: Pool,
  roster: PoolerRoster,
  droppedPlayerId: number,
  addedPlayer: Player,
): "lineup" | "bench" | "no-room" => {
  const limits = {
    F: pool.settings.number_forwards,
    D: pool.settings.number_defenders,
    G: pool.settings.number_goalies,
  };
  const groups = {
    F: roster.chosen_forwards,
    D: roster.chosen_defenders,
    G: roster.chosen_goalies,
  };

  // The drop happens first, so the incoming player is measured against the
  // roster the drop leaves behind.
  const group = groups[addedPlayer.position].filter(
    (playerId) => playerId !== droppedPlayerId,
  );

  if (
    group.length < limits[addedPlayer.position] &&
    fitsUnderCap(pool, roster, droppedPlayerId, addedPlayer)
  ) {
    return "lineup";
  }

  const bench = roster.chosen_reservists.filter(
    (playerId) => playerId !== droppedPlayerId,
  );
  return bench.length < pool.settings.number_reservists ? "bench" : "no-room";
};
