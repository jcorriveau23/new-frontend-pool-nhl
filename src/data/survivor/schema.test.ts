import { describe, expect, it } from "vitest";

import { SurvivorGameState } from "@/data/survivor/model";
import { parseSurvivorPickOptions } from "@/data/survivor/schema";
import { displayScore, gameStatus, matchupsCoverTeams } from "@/lib/survivor";

/*
The pick screen's payload, as the backend sends it.

This schema gates the whole of `pick-options`, so what it refuses is what takes
the pick screen down. The games on it are the newest part and the part most
likely to differ between a deployed backend and this frontend, which is what
these pin down.
*/
const pickOptions = (games?: unknown) => ({
  week: 1,
  pick_date: "2026-10-10",
  eligible_team_ids: [8, 10],
  available_team_ids: [8, 10],
  used_team_ids: [],
  current_pick: null,
  is_blocked: false,
  can_pick: true,
  ...(games === undefined ? {} : { games }),
});

const fullGame = {
  home_team_id: 10,
  away_team_id: 8,
  home_score: 4,
  away_score: 1,
  state: "Final",
  start_time_utc: "2026-10-10T23:00:00Z",
  period: 3,
  period_type: "REG",
  time_remaining: "00:00",
  in_intermission: false,
};

describe("parseSurvivorPickOptions", () => {
  it("accepts the payload with its games", () => {
    const parsed = parseSurvivorPickOptions(pickOptions([fullGame]));

    expect(parsed).not.toBeNull();
    expect(parsed?.games?.[0].state).toBe(SurvivorGameState.Final);
  });

  it("accepts a payload with no games at all", () => {
    // A backend older than the matchups. The screen falls back to the grid.
    const parsed = parseSurvivorPickOptions(pickOptions());

    expect(parsed).not.toBeNull();
    expect(matchupsCoverTeams(parsed?.games, [8, 10])).toBe(false);
  });

  it("accepts a game carrying nothing but its two teams", () => {
    /*
    The important one. Everything but the team ids describes the game rather
    than identifying it, so a backend that words any of it differently should
    cost the date its scores — not refuse the payload and leave somebody unable
    to pick at all.
    */
    const parsed = parseSurvivorPickOptions(
      pickOptions([{ home_team_id: 10, away_team_id: 8 }]),
    );

    expect(parsed).not.toBeNull();

    const game = parsed?.games?.[0];
    expect(game).toBeDefined();
    // Still a matchup worth laying out, just with nothing to say about it.
    expect(matchupsCoverTeams(parsed?.games, [8, 10])).toBe(true);
    expect(displayScore(game!)).toBeNull();
    expect(gameStatus(game!)).toEqual({ kind: "upcoming", startTimeUtc: null });
  });

  it("keeps a field it does not know about", () => {
    const parsed = parseSurvivorPickOptions(
      pickOptions([{ ...fullGame, shots_on_goal: 31 }]),
    );

    expect(parsed?.games?.[0]).toMatchObject({ shots_on_goal: 31 });
  });

  it("refuses a game with no teams, which is not a matchup", () => {
    expect(
      parseSurvivorPickOptions(pickOptions([{ state: "Live" }])),
    ).toBeNull();
  });

  it("refuses a payload missing what a pick actually needs", () => {
    const { eligible_team_ids, ...withoutTeams } = pickOptions([fullGame]);
    expect(eligible_team_ids).toBeDefined();

    expect(parseSurvivorPickOptions(withoutTeams)).toBeNull();
  });
});
