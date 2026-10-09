import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ParticipantStatus,
  PickOutcome,
  SurvivorState,
  WeekStatus,
} from "@/data/survivor/model";
import {
  createSurvivorPool,
  deleteSurvivorPool,
  fetchMyPicks,
  fetchPickOptions,
  fetchSurvivorPool,
  fetchSurvivorPools,
  fetchSurvivorStandings,
  fetchWeekPicks,
  joinSurvivorPool,
  leaveSurvivorPool,
  lockSurvivorWeek,
  makeSurvivorPick,
  settleSurvivorWeek,
  updateSurvivorSettings,
} from "./survivor-api";

const mockFetch = (impl: (url: string, init?: RequestInit) => Response) => {
  const spy = vi.fn((url: string, init?: RequestInit) =>
    Promise.resolve(impl(url, init)),
  );
  vi.stubGlobal("fetch", spy);
  return spy;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

afterEach(() => {
  vi.unstubAllGlobals();
});

const settings = {
  assistants: [],
  max_participants: 100,
  strikes_allowed: 0,
  missed_pick_is_strike: true,
  allow_pick_change: true,
  league_team_count: 32,
};

// A document that satisfies the schema, so a parse failure in a test means the
// code under test, not the fixture.
const pool = {
  name: "my-pool",
  owner: "owner",
  settings,
  status: SurvivorState.Created,
  participants: [
    {
      id: "owner",
      name: "owner",
      status: ParticipantStatus.Alive,
      strikes: 0,
      eliminated_week: null,
      date_joined: 0,
    },
  ],
  weeks: [
    {
      week: 1,
      pick_date: "2026-10-03",
      status: WeekStatus.Open,
      eligible_team_ids: [8, 10],
      settled_at: null,
    },
  ],
  winners: null,
  date_updated: 1,
  season: 20262027,
  season_start: "2026-09-29",
  season_end: "2027-04-10",
};

const pickOptions = {
  week: 1,
  pick_date: "2026-10-03",
  eligible_team_ids: [8, 10],
  available_team_ids: [10],
  used_team_ids: [8],
  current_pick: null,
  is_blocked: false,
  can_pick: true,
};

const standings = {
  pool_name: "my-pool",
  status: SurvivorState.InProgress,
  alive_count: 1,
  eliminated_count: 0,
  revealed_weeks: [1],
  rows: [
    {
      participant_id: "owner",
      name: "owner",
      status: ParticipantStatus.Alive,
      strikes: 0,
      eliminated_week: null,
      wins: 1,
      picks: { "1": { team_id: 10, outcome: PickOutcome.Won } },
    },
  ],
  winners: null,
};

describe("fetchSurvivorPool", () => {
  it("reads the pool off the survivor path", async () => {
    const spy = mockFetch(() => json(pool));

    const res = await fetchSurvivorPool("my-pool");

    expect(spy.mock.calls[0][0]).toBe("/api-rust/survivor/my-pool");
    expect(res).toEqual({ ok: true, data: pool });
  });

  /*
  The [name] segment arrives still percent-encoded, so it is interpolated
  as-is: encoding it again would have the backend look up a pool literally
  named "Raph%20gagne".
  */
  it("does not re-encode a name that arrives percent-encoded", async () => {
    const spy = mockFetch(() => json(pool));

    await fetchSurvivorPool("Raph%20gagne");

    expect(spy.mock.calls[0][0]).toBe("/api-rust/survivor/Raph%20gagne");
  });

  it("reports a document that is not a survivor pool", async () => {
    mockFetch(() => json({ name: "my-pool", unexpected: true }));

    const res = await fetchSurvivorPool("my-pool");

    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toMatch(/malformed/);
  });

  it("forwards the backend's own message on a refusal", async () => {
    mockFetch(() => new Response("no survivor pool found", { status: 404 }));

    expect(await fetchSurvivorPool("nope")).toEqual({
      ok: false,
      error: "no survivor pool found",
    });
  });
});

describe("fetchSurvivorPools", () => {
  it("lists a season's pools", async () => {
    const spy = mockFetch(() => json([]));

    const res = await fetchSurvivorPools(20262027);

    expect(spy.mock.calls[0][0]).toBe("/api-rust/survivor-pools/20262027");
    expect(res).toEqual({ ok: true, data: [] });
  });
});

describe("fetchSurvivorStandings", () => {
  it("reads the standings, already counted by the backend", async () => {
    const spy = mockFetch(() => json(standings));

    const res = await fetchSurvivorStandings("my-pool");

    expect(spy.mock.calls[0][0]).toBe("/api-rust/survivor/my-pool/standings");
    expect(res).toEqual({ ok: true, data: standings });
  });

  it("reports standings that do not hold up", async () => {
    mockFetch(() => json({ pool_name: "my-pool" }));

    const res = await fetchSurvivorStandings("my-pool");

    expect(res.ok).toBe(false);
  });
});

describe("the authenticated reads", () => {
  it("sends the bearer token, since the answer is per participant", async () => {
    const spy = mockFetch(() => json(pickOptions));

    const res = await fetchPickOptions("my-pool", 1, "the-token");

    expect(spy.mock.calls[0][0]).toBe(
      "/api-rust/survivor/my-pool/pick-options/1",
    );
    expect(spy.mock.calls[0][1]?.headers).toEqual({
      Authorization: "Bearer the-token",
    });
    expect(res).toEqual({ ok: true, data: pickOptions });
  });

  // Regression guard of the same kind client-api carries: a missing token used
  // to be interpolated, sending the literal "Bearer undefined".
  it.each([
    ["undefined", undefined],
    ["null", null],
    ["empty", ""],
  ])("does not call the backend when the token is %s", async (_label, jwt) => {
    const spy = mockFetch(() => json(pickOptions));

    expect(await fetchPickOptions("my-pool", 1, jwt)).toEqual({
      ok: false,
      error: "unauthenticated",
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("reads a date's picks", async () => {
    const spy = mockFetch(() => json([]));

    const res = await fetchWeekPicks("my-pool", 2, "the-token");

    expect(spy.mock.calls[0][0]).toBe("/api-rust/survivor/my-pool/picks/2");
    expect(res).toEqual({ ok: true, data: [] });
  });

  it("reads the caller's own picks", async () => {
    const spy = mockFetch(() => json([]));

    await fetchMyPicks("my-pool", "the-token");

    expect(spy.mock.calls[0][0]).toBe("/api-rust/survivor/my-pool/my-picks");
  });

  it("forwards a refusal's message", async () => {
    mockFetch(() => new Response("You are not in this pool.", { status: 403 }));

    expect(await fetchMyPicks("my-pool", "the-token")).toEqual({
      ok: false,
      error: "You are not in this pool.",
    });
  });

  it("falls back to the status when the error body is empty", async () => {
    mockFetch(() => new Response("", { status: 500 }));

    const res = await fetchMyPicks("my-pool", "the-token");

    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toContain("500");
  });

  it("treats an empty successful body as no data", async () => {
    mockFetch(() => new Response("", { status: 200 }));

    expect(await fetchMyPicks("my-pool", "the-token")).toEqual({
      ok: true,
      data: null,
    });
  });

  it("reports a network failure instead of rejecting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );

    const res = await fetchMyPicks("my-pool", "the-token");

    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toMatch(/could not be reached/);
  });
});

describe("the mutations", () => {
  it("creates a pool", async () => {
    const spy = mockFetch(() => json(pool));

    const res = await createSurvivorPool(
      {
        pool_name: "my-pool",
        settings,
        participant_name: "Raph",
      },
      "the-token",
    );

    expect(spy.mock.calls[0][0]).toBe("/api-rust/create-survivor-pool");
    expect(JSON.parse(spy.mock.calls[0][1]!.body as string)).toEqual({
      pool_name: "my-pool",
      settings,
      participant_name: "Raph",
    });
    expect(res.ok).toBe(true);
  });

  it("deletes a pool", async () => {
    const spy = mockFetch(() => new Response("", { status: 200 }));

    await deleteSurvivorPool("my-pool", "the-token");

    expect(spy.mock.calls[0][0]).toBe("/api-rust/delete-survivor-pool");
    expect(JSON.parse(spy.mock.calls[0][1]!.body as string)).toEqual({
      pool_name: "my-pool",
    });
  });

  it("updates the settings", async () => {
    const spy = mockFetch(() => json(pool));

    await updateSurvivorSettings("my-pool", settings, "the-token");

    expect(spy.mock.calls[0][0]).toBe("/api-rust/update-survivor-settings");
    expect(JSON.parse(spy.mock.calls[0][1]!.body as string)).toEqual({
      pool_name: "my-pool",
      settings,
    });
  });

  // The participant is whoever the token names; the body carries only the
  // display name, so a caller cannot sign somebody else up.
  it("joins a pool with a display name and no id", async () => {
    const spy = mockFetch(() => json(pool));

    await joinSurvivorPool("my-pool", "Raph", "the-token");

    expect(spy.mock.calls[0][0]).toBe("/api-rust/join-survivor-pool");
    expect(JSON.parse(spy.mock.calls[0][1]!.body as string)).toEqual({
      pool_name: "my-pool",
      participant_name: "Raph",
    });
  });

  it("leaves a pool", async () => {
    const spy = mockFetch(() => json(pool));

    await leaveSurvivorPool("my-pool", "someone", "the-token");

    expect(JSON.parse(spy.mock.calls[0][1]!.body as string)).toEqual({
      pool_name: "my-pool",
      participant_id: "someone",
    });
  });

  it("names a team for a date", async () => {
    const spy = mockFetch(() => json(pickOptions));

    const res = await makeSurvivorPick("my-pool", 3, 10, "the-token");

    expect(spy.mock.calls[0][0]).toBe("/api-rust/survivor-pick");
    expect(JSON.parse(spy.mock.calls[0][1]!.body as string)).toEqual({
      pool_name: "my-pool",
      week: 3,
      team_id: 10,
    });
    // Answers with the pick screen as it now stands, so the caller does not
    // re-derive what is still open to them.
    expect(res).toEqual({ ok: true, data: pickOptions });
  });

  it("forwards a refused pick verbatim, since the message is for the user", async () => {
    mockFetch(
      () =>
        new Response("You have already used this team.", {
          status: 400,
        }),
    );

    expect(await makeSurvivorPick("my-pool", 3, 10, "the-token")).toEqual({
      ok: false,
      error: "You have already used this team.",
    });
  });

  // Neither carries a result: who won is read from the league's scoreboard
  // inside the backend.
  it("locks and settles a date by name and number only", async () => {
    const spy = mockFetch(() => json(pool));

    await lockSurvivorWeek("my-pool", 4, "the-token");
    await settleSurvivorWeek("my-pool", 4, "the-token");

    expect(spy.mock.calls[0][0]).toBe("/api-rust/lock-survivor-week");
    expect(spy.mock.calls[1][0]).toBe("/api-rust/settle-survivor-week");
    for (const call of spy.mock.calls) {
      expect(JSON.parse(call[1]!.body as string)).toEqual({
        pool_name: "my-pool",
        week: 4,
      });
    }
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["empty", ""],
  ])("does not send a mutation when the token is %s", async (_label, jwt) => {
    const spy = mockFetch(() => json(pool));

    expect(await makeSurvivorPick("my-pool", 1, 10, jwt)).toEqual({
      ok: false,
      error: "unauthenticated",
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
