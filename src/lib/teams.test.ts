import { describe, expect, it } from "vitest";

import team_info, { abbrevToTeamId, teamIdToAbbrev, teamLabel } from "./teams";

describe("teamIdToAbbrev", () => {
  it("inverts the code list rather than restating it", () => {
    for (const [abbrev, teamId] of Object.entries(abbrevToTeamId)) {
      expect(teamIdToAbbrev[teamId]).toBe(abbrev);
    }
  });

  /*
  Both lists are pasted out of the league's own franchise endpoint and kept by
  hand, and nothing in the types holds them together. This is what does: a team
  added to one and not the other shows up here rather than as a blank column in
  an exported roster.
  */
  it("covers every team the franchise list knows", () => {
    const withoutCode = Object.keys(team_info)
      .map(Number)
      .filter((teamId) => teamIdToAbbrev[teamId] === undefined);

    expect(withoutCode).toEqual([]);
  });
});

describe("teamLabel", () => {
  it("is the three letter code for a team that has one", () => {
    expect(teamLabel(8)).toBe("MTL");
  });

  it("has nothing to say for a player with no team", () => {
    expect(teamLabel(null)).toBeNull();
    expect(teamLabel(undefined)).toBeNull();
  });

  it("has nothing to say for a team it has never heard of", () => {
    expect(teamLabel(9999)).toBeNull();
  });
});
