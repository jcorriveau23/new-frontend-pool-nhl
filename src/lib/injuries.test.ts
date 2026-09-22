import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getInjuriesByTeam,
  groupInjuriesByTeam,
  InjuredPlayer,
} from "./injuries";

const MONTREAL = 8;
const TORONTO = 10;

const injury = (name: string, team?: number | null): InjuredPlayer => ({
  name,
  position: "C",
  date: "Mon, Sep 1",
  type: "Knee",
  recovery: "Out indefinitely",
  ...(team === undefined ? {} : { team }),
});

describe("groupInjuriesByTeam", () => {
  it("sorts teams by name and players by name within a team", () => {
    const groups = groupInjuriesByTeam(
      {
        "1": injury("Zach"),
        "2": injury("Adam"),
        "3": injury("Mitch"),
      },
      { 1: TORONTO, 2: TORONTO, 3: MONTREAL }
    );

    expect(groups.map((group) => group.teamName)).toEqual([
      "Montréal Canadiens",
      "Toronto Maple Leafs",
    ]);
    expect(groups[1].players.map((player) => player.name)).toEqual([
      "Adam",
      "Zach",
    ]);
    expect(groups[1].players[0].id).toBe(2);
  });

  it("puts players with no team, or a team with no name, in a last group", () => {
    const groups = groupInjuriesByTeam(
      {
        "1": injury("Free Agent"),
        "2": injury("Unknown Team"),
        "3": injury("Leaf"),
      },
      { 2: 999_999, 3: TORONTO }
    );

    expect(groups).toHaveLength(2);
    expect(groups[0].teamId).toBe(TORONTO);
    expect(groups[1]).toMatchObject({ teamId: null, teamName: null });
    expect(groups[1].players.map((player) => player.name)).toEqual([
      "Free Agent",
      "Unknown Team",
    ]);
  });

  it("returns no groups for an empty report", () => {
    expect(groupInjuriesByTeam({}, {})).toEqual([]);
  });
});

describe("getInjuriesByTeam", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the teams the scraper wrote without calling the NHL API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const groups = await getInjuriesByTeam({
      "1": injury("Leaf", TORONTO),
      "2": injury("Free Agent", null),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(groups.map((group) => group.teamId)).toEqual([TORONTO, null]);
  });

  it("resolves entries without a team field through the NHL API", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/roster/TOR/current")) {
        return Response.json({ forwards: [{ id: 1 }] });
      }
      if (url.endsWith("/player/2/landing")) {
        return Response.json({ currentTeamId: MONTREAL });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const groups = await getInjuriesByTeam({
      "1": injury("Leaf"),
      "2": injury("Hab"),
      "3": injury("Known", TORONTO),
    });

    expect(
      groups.map((group) => [
        group.teamId,
        group.players.map((player) => player.id),
      ])
    ).toEqual([
      [MONTREAL, [2]],
      [TORONTO, [3, 1]],
    ]);
    // Only the entry the roster did not list gets a per-player lookup.
    const landingCalls = fetchMock.mock.calls.filter(([url]) =>
      url.includes("/landing")
    );
    expect(landingCalls.map(([url]) => url)).toEqual([
      "https://api-web.nhle.com/v1/player/2/landing",
    ]);
  });
});
