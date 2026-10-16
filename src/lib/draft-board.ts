/*
The draft board: who picks, in which order, and how far the draft has got.

Lifted out of `@/components/draft`, which held it as four closures over the
pool context and recomputed them in an effect. It moved here because it is a
rule and not a rendering — "whose pick is 37" is the one question a draft has,
and the answer is a page of arithmetic over the draft order, the traded picks
and the roster sizes. The export reads the same board the draft screen draws,
which is the point: a pick list that disagrees with the screen it was taken
from is worse than no pick list.

This decides what to render, never what is allowed. The backend owns the draft
and refuses a pick out of turn.
*/
import { Pool, PoolState } from "@/data/pool/model";

export interface DraftPickSlot {
  // Participant id of whoever owns the pick.
  drafter: string;
  // Participant id the pick was acquired from, null when it is their own.
  from: string | null;
  // A dynasty pick that falls to somebody whose roster is already full, so it
  // is skipped rather than played.
  done?: boolean | null;
}

export interface DraftRound {
  // 1-based, as it is shown.
  round: number;
  // First to last.
  picks: DraftPickSlot[];
}

export interface DraftBoard {
  rounds: DraftRound[];
  // Participant id on the clock, null once the draft is over.
  currentDrafter: string | null;
  // 1-based, null once the draft is over.
  currentRound: number | null;
  // Picks the draft will actually play, skipped ones excluded.
  totalPicks: number;
}

/*
A ceiling on the round loop.

The loop runs until every pooler's roster is full, which it reaches by counting
one pick per pooler per round — unless a dynasty pool's `past_tradable_picks`
names an owner who is not in the pool, in which case the count it increments
belongs to nobody and no round ever fills a roster. That is a malformed pool
rather than a state worth handling, and the loop used to meet it by hanging the
tab. It stops here instead, with however many rounds it managed, which is a
board somebody can look at and report.
*/
const MAX_ROUNDS = 200;

/*
How many players each pooler has to draft.

The whole roster, bench included, less the players a dynasty pool let them keep
— those are already on the roster before the draft opens.
*/
export function playersToDraft(poolInfo: Pool): number {
  return (
    poolInfo.settings.number_forwards +
    poolInfo.settings.number_defenders +
    poolInfo.settings.number_goalies +
    poolInfo.settings.number_reservists -
    (poolInfo.settings.dynasty_settings?.next_season_number_players_protected ??
      0)
  );
}

const isDraftDone = (
  draftedCountPerPooler: Map<string, number>,
  participants: string[],
  playerCount: number,
): boolean =>
  participants.every(
    (participant) =>
      (draftedCountPerPooler.get(participant) ?? 0) >= playerCount,
  );

/*
A dynasty round, where the picks have been tradable since last season.

The order is still the draft order, but each slot of it is played by whoever
owns that pick now — `past_tradable_picks[round][originalOwner]` — so a pooler
who bought three first-rounders picks three times in round one. Past the rounds
the pool made tradable, picks are nobody's to trade and the draft order plays
itself, and a pooler whose roster filled up along the way is skipped.
*/
function dynastyRoundDrafters(
  poolInfo: Pool,
  draftedCountPerPooler: Map<string, number>,
  draftOrder: string[],
  roundIndex: number,
  playerCount: number,
): DraftPickSlot[] {
  const tradablePicks = poolInfo.context?.past_tradable_picks ?? null;
  const picks: DraftPickSlot[] = [];

  for (const originalOwner of draftOrder) {
    if (tradablePicks !== null && roundIndex < tradablePicks.length) {
      const owner = tradablePicks[roundIndex][originalOwner];

      draftedCountPerPooler.set(
        owner,
        (draftedCountPerPooler.get(owner) ?? 0) + 1,
      );
      picks.push({
        drafter: owner,
        from: owner === originalOwner ? null : originalOwner,
      });
      continue;
    }

    draftedCountPerPooler.set(
      originalOwner,
      (draftedCountPerPooler.get(originalOwner) ?? 0) + 1,
    );
    picks.push({
      drafter: originalOwner,
      from: null,
      done: (draftedCountPerPooler.get(originalOwner) ?? 0) > playerCount,
    });
  }

  return picks;
}

/*
A round of a draft whose picks were never tradable: the draft order, reversed
on every other round.

Serpentine is applied unconditionally, which is what the draft screen has
always drawn and is kept here so the extraction changes nothing on screen. It
does not read `settings.draft_type`, so a pool set to Standard is drawn as a
serpentine — see the note in the module's tests.
*/
function regularRoundDrafters(
  draftedCountPerPooler: Map<string, number>,
  draftOrder: string[],
  roundIndex: number,
): DraftPickSlot[] {
  return draftOrder.map((_participant, index) => {
    const drafter =
      roundIndex % 2
        ? draftOrder[draftOrder.length - 1 - index]
        : draftOrder[index];

    draftedCountPerPooler.set(
      drafter,
      (draftedCountPerPooler.get(drafter) ?? 0) + 1,
    );

    return { drafter, from: null };
  });
}

export function buildDraftRounds(poolInfo: Pool): DraftRound[] {
  if (poolInfo.draft_order === null || poolInfo.context === null) {
    return [];
  }

  const playerCount = playersToDraft(poolInfo);
  const isDynasty =
    poolInfo.settings.dynasty_settings !== null &&
    (poolInfo.context.past_tradable_picks ?? null) !== null;

  // Counts how many picks each pooler has been handed so far, which is what
  // tells the loop when every roster is full. Seeded empty: a dynasty pool's
  // protected players are taken out of `playersToDraft` instead.
  const draftedCountPerPooler = new Map<string, number>();
  const rounds: DraftRound[] = [];

  while (
    !isDraftDone(draftedCountPerPooler, poolInfo.draft_order, playerCount) &&
    rounds.length < MAX_ROUNDS
  ) {
    rounds.push({
      round: rounds.length + 1,
      picks: isDynasty
        ? dynastyRoundDrafters(
            poolInfo,
            draftedCountPerPooler,
            poolInfo.draft_order,
            rounds.length,
            playerCount,
          )
        : regularRoundDrafters(
            draftedCountPerPooler,
            poolInfo.draft_order,
            rounds.length,
          ),
    });
  }

  return rounds;
}

// How many picks have been played. The list carries a 0 for every drafter it
// skipped, so its length is the position in the draft rather than a count of
// players.
export const picksMade = (poolInfo: Pool): number =>
  poolInfo.context?.players_name_drafted.length ?? 0;

/*
The player taken with a pick, or null for one not played yet.

`players_name_drafted` holds a 0 wherever a drafter was skipped, and no player
is keyed "0", so a skipped slot falls out as null the same way a future one
does.
*/
export const draftedPlayerAt = (poolInfo: Pool, pickIndex: number) =>
  poolInfo.context?.players[poolInfo.context.players_name_drafted[pickIndex]] ??
  null;

export function buildDraftBoard(poolInfo: Pool): DraftBoard {
  const rounds = buildDraftRounds(poolInfo);
  const picksPerRound = poolInfo.settings.number_poolers;
  const made = picksMade(poolInfo);

  const roundIndex =
    picksPerRound > 0 && made < picksPerRound * playersToDraft(poolInfo)
      ? Math.floor(made / picksPerRound)
      : null;

  const currentDrafter =
    roundIndex !== null
      ? (rounds[roundIndex]?.picks[made % picksPerRound]?.drafter ?? null)
      : null;

  return {
    rounds,
    currentDrafter,
    currentRound: roundIndex !== null ? roundIndex + 1 : null,
    totalPicks: rounds.reduce(
      (total, round) => total + round.picks.filter((pick) => !pick.done).length,
      0,
    ),
  };
}

/*
The draft as a flat list of picks, for the export.

One row per slot the draft laid out, in the order they are played, carrying the
player where there is one. A pick not yet played is kept rather than dropped:
the list is also how somebody looks at what is left, and a draft in progress is
exactly when that is worth printing.
*/
export interface DraftBoardPick {
  // 1-based position in the whole draft, as the screen numbers it.
  overall: number;
  round: number;
  drafter: string;
  from: string | null;
  skipped: boolean;
  playerId: number | null;
}

export function flattenDraftBoard(poolInfo: Pool): DraftBoardPick[] {
  return buildDraftRounds(poolInfo).flatMap((round) =>
    round.picks.map((pick, index) => {
      const overallIndex = (round.round - 1) * round.picks.length + index;

      return {
        overall: overallIndex + 1,
        round: round.round,
        drafter: pick.drafter,
        from: pick.from,
        skipped: pick.done === true,
        playerId: draftedPlayerAt(poolInfo, overallIndex)?.id ?? null,
      };
    }),
  );
}

// Whether the pool has a draft worth exporting at all: one that has been laid
// out, which every state but the lobby has.
export const hasDraftBoard = (poolInfo: Pool): boolean =>
  poolInfo.status !== PoolState.Created && poolInfo.draft_order !== null;
