import team_info from "./teams";

// The first season the NHL ever played. This never changes, unlike the current
// season constants which come from the backend (see @/lib/season-info).
export const FIRST_NHL_SEASON = 1916;

export const getAllYears = (
  startYear: number,
  endYear: number,
) => {
  // Return all the years between 2 years.
  const seasonArray = [];
  for (let i = endYear; i > startYear; i -= 1) {
    seasonArray.push(i);
  }
  return seasonArray;
};

export const getAllSeasons = (
  startYear: number,
  endYear: number,
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
        team_info[Number(teamId)].lastSeason! >= season),
  );

export const getAllSeasonsForTeam = (teamId: number, lastSeason: number) =>
  getAllSeasons(
    Math.floor(team_info[teamId]?.firstSeason / 10000),
    team_info[teamId]?.lastSeason
      ?
        Math.floor(team_info[teamId]?.lastSeason / 10000)
      : lastSeason,
  );

export const getAllYearsForTeam = (teamId: number, lastSeason: number) =>
  getAllYears(
    Math.floor(team_info[teamId]?.firstSeason / 10000),
    team_info[teamId]?.lastSeason
      ?
        Math.floor(team_info[teamId]?.lastSeason / 10000)
      : lastSeason,
  );
