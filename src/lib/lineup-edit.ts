/*
The lineup a pooler arranges in the roster dialog, as data.

`starting-roster.tsx` owns the markup, the permissions and the request; the
arrangement itself — moving a player to and from the bench, what counts as an
unsaved change, and what the backend would refuse — lives here where it can be
tested without a pool context.
*/

import { Player, Position } from "@/data/pool/model";

export interface Lineup {
  forwards: Player[];
  defense: Player[];
  goalies: Player[];
  reservists: Player[];
}

export type StarterGroup = "forwards" | "defense" | "goalies";

export const STARTER_GROUP: Record<Position, StarterGroup> = {
  [Position.F]: "forwards",
  [Position.D]: "defense",
  [Position.G]: "goalies",
};

export const GROUP_TITLE: Record<StarterGroup, string> = {
  forwards: "Forwards",
  defense: "Defense",
  goalies: "Goalies",
};

const POSITION_ORDER = [Position.F, Position.D, Position.G];

export const bySalary = (players: Player[]): Player[] =>
  [...players].sort((p1, p2) => (p2.salary_cap ?? 0) - (p1.salary_cap ?? 0));

// The bench mixes positions, grouping them keeps it readable.
export const byPositionThenSalary = (players: Player[]): Player[] =>
  [...players].sort(
    (p1, p2) =>
      POSITION_ORDER.indexOf(p1.position) -
        POSITION_ORDER.indexOf(p2.position) ||
      (p2.salary_cap ?? 0) - (p1.salary_cap ?? 0),
  );

// A copy that can be rearranged without touching the roster it came from.
export const toLineup = (roster: Lineup): Lineup => ({
  forwards: [...roster.forwards],
  defense: [...roster.defense],
  goalies: [...roster.goalies],
  reservists: [...roster.reservists],
});

export const LINEUP_GROUPS: (keyof Lineup)[] = [
  "forwards",
  "defense",
  "goalies",
  "reservists",
];

/*
Identifies which players sit in which group, and nothing else. Comparing it to
the saved roster's is how the dialog notices the pool changed underneath it,
so the order players are listed in must not register as a change.
*/
export const lineupSignature = (lineup: Lineup): string =>
  LINEUP_GROUPS.map((group) =>
    lineup[group]
      .map((player) => player.id)
      .sort((a, b) => a - b)
      .join(","),
  ).join("|");

export const moveToReserves = (lineup: Lineup, player: Player): Lineup => ({
  ...lineup,
  [STARTER_GROUP[player.position]]: lineup[
    STARTER_GROUP[player.position]
  ].filter((p) => p.id !== player.id),
  reservists: [...lineup.reservists, player],
});

export const moveToLineup = (lineup: Lineup, player: Player): Lineup => ({
  ...lineup,
  [STARTER_GROUP[player.position]]: [
    ...lineup[STARTER_GROUP[player.position]],
    player,
  ],
  reservists: lineup.reservists.filter((p) => p.id !== player.id),
});

export const starters = (lineup: Lineup): Player[] => [
  ...lineup.forwards,
  ...lineup.defense,
  ...lineup.goalies,
];

export const totalStartersSalary = (lineup: Lineup): number =>
  starters(lineup).reduce(
    (total, player) => total + (player.salary_cap ?? 0),
    0,
  );

/*
How many players sit on a different side of the bench than they do in the saved
roster. Both directions count once, which is what makes a player moved out and
back again register as no change at all.
*/
export const countMovedPlayers = (lineup: Lineup, saved: Lineup): number => {
  const benched = new Set(lineup.reservists.map((player) => player.id));
  const savedBenched = new Set(saved.reservists.map((player) => player.id));

  return [...new Set([...benched, ...savedBenched])].filter(
    (playerId) => benched.has(playerId) !== savedBenched.has(playerId),
  ).length;
};

export type StarterLimits = Record<StarterGroup, number>;

/*
Why the backend would refuse this lineup, or null when it would take it.

The issue is returned as data rather than as a message: the same checks run
before the request is sent so the pooler knows what to fix, and the component
turns it into translated text.
*/
export type LineupIssue =
  | {
      kind: "too-many-players";
      group: StarterGroup;
      count: number;
      limit: number;
    }
  | { kind: "player-without-contract"; player: Player }
  | { kind: "over-salary-cap"; overBy: number };

export function findLineupIssue(
  lineup: Lineup,
  limits: StarterLimits,
  teamSalaryCap: number | null,
): LineupIssue | null {
  for (const [group, limit] of Object.entries(limits) as [
    StarterGroup,
    number,
  ][]) {
    if (lineup[group].length > limit) {
      return {
        kind: "too-many-players",
        group,
        count: lineup[group].length,
        limit,
      };
    }
  }

  if (teamSalaryCap === null) {
    return null;
  }

  const playerWithoutContract = starters(lineup).find(
    (player) => player.salary_cap === null,
  );
  if (playerWithoutContract) {
    return { kind: "player-without-contract", player: playerWithoutContract };
  }

  const totalSalary = totalStartersSalary(lineup);
  if (totalSalary > teamSalaryCap) {
    return { kind: "over-salary-cap", overBy: totalSalary - teamSalaryCap };
  }

  return null;
}
