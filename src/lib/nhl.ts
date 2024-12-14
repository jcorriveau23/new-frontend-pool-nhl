import team_info from "./teams";

export const FIRST_NHL_SEASON = 1916;
export const LAST_NHL_SEASON = 2024;

export const CURRENT_NHL_SEASON = "20242025";
export const CURRENT_DRAFT_YEAR = "2024";

export const getAllYears = (
  startYear: number = FIRST_NHL_SEASON,
  endYear: number = LAST_NHL_SEASON,
) => {
  // Return all the years between 2 years.
  const seasonArray = [];
  for (let i = endYear; i > startYear; i -= 1) {
    seasonArray.push(i);
  }
  return seasonArray;
};

export const getAllSeasons = (
  startYear: number = FIRST_NHL_SEASON,
  endYear: number = LAST_NHL_SEASON,
) => {
  // Return all the season between 2 years.
  const seasonArray = [];
  for (let i = endYear; i > startYear; i -= 1) {
    seasonArray.push(i * 10000 + i + 1);
  }
  return seasonArray;
};

export const getAllTeamForSeason = (season: number) =>
  Object.keys(team_info).filter(
    (teamId) =>
      team_info[Number(teamId)].firstSeason <= season &&
      (team_info[Number(teamId)].lastSeason == null ||
        // @ts-ignore
        team_info[Number(teamId)].lastSeason >= season),
  );

export const getAllSeasonsForTeam = (teamId: number) =>
  getAllSeasons(
    Math.floor(team_info[teamId]?.firstSeason / 10000),
    team_info[teamId]?.lastSeason
      ? // @ts-ignore
        Math.floor(team_info[teamId]?.lastSeason / 10000)
      : LAST_NHL_SEASON,
  );

export const getAllYearsForTeam = (teamId: number) =>
  getAllYears(
    Math.floor(team_info[teamId]?.firstSeason / 10000),
    team_info[teamId]?.lastSeason
      ? // @ts-ignore
        Math.floor(team_info[teamId]?.lastSeason / 10000)
      : LAST_NHL_SEASON,
  );
