/*
Module that share context related to the selected pool.
*/
"use client";
import {
  GoaliePoints,
  GoaliesSettings,
  Pool,
  PoolSettings,
  PoolUser,
  SkaterPoints,
  SkaterSettings,
} from "@/data/pool/model";
import React, { createContext, useContext, ReactNode, useState } from "react";
import { useRouter } from "@/navigation";
import { db } from "@/db";
import { useDailyLeadersContext } from "./daily-leaders-context";
import { DailyLeaders } from "@/data/dailyLeaders/model";
import { format } from "date-fns";
import { useDateContext } from "./date-context";

export interface DailyPoolPointsMade {
  // Daily pool information.
  dateOfInterest: string;
  cumulated: boolean;
  forwardsDailyStats: Record<string, SkaterDailyInfo[]>;
  defendersDailyStats: Record<string, SkaterDailyInfo[]>;
  goaliesDailyStats: Record<string, GoalieDailyInfo[]>;
  totalDailyPoints: TotalDailyPoints[];
}

export interface PoolContextProps {
  // keeps the information of which participant is selected across the pool.
  selectedParticipant: string;
  selectedPoolUser: PoolUser;
  updateSelectedParticipant: (participant: string) => void;

  lastFormatDate: string | null;

  // Map the player id to its pool owner.
  playersOwner: Record<number, string>;
  updatePlayersOwner: (poolInfo: Pool) => void;

  poolInfo: Pool;
  updatePoolInfo: (newPoolInfo: Pool) => void;

  dictUsers: Record<string, PoolUser>;

  dailyPointsMade: DailyPoolPointsMade | null;
}

export class SkatersDailyTotalPoints {
  constructor(skaters: SkaterDailyInfo[], skaters_settings: SkaterSettings) {
    this.numberOfGame = skaters.filter((skater) => skater.played).length;
    this.goals = skaters.reduce((acc, skater) => acc + skater.goals, 0);
    this.assists = skaters.reduce((acc, skater) => acc + skater.assists, 0);
    this.hattricks = skaters.filter((skater) => skater.goals >= 3).length;
    this.shootoutGoals = skaters.reduce(
      (acc, skater) => acc + skater.shootoutGoals,
      0
    );
    this.totalPoints = skaters.reduce(
      (acc, skater) => acc + skater.goals + skater.assists,
      0
    );
    this.totalPoolPoints = skaters.reduce(
      (acc, skater) => acc + skater.getTotalPoolPts(skaters_settings),
      0
    );
  }
  numberOfGame: number;
  goals: number;
  assists: number;
  hattricks: number;
  shootoutGoals: number;
  totalPoints: number;
  totalPoolPoints: number;
}

export class GoaliesDailyTotalPoints {
  constructor(goalies: GoalieDailyInfo[], settings: GoaliesSettings) {
    this.numberOfGame = goalies.filter((goalie) => goalie.played).length;
    this.goals = goalies.reduce((acc, goalie) => acc + goalie.goals, 0);
    this.assists = goalies.reduce((acc, goalie) => acc + goalie.assists, 0);
    this.wins = goalies.filter(
      (goalie) => goalie.status === GoalieGameStatus.Win
    ).length;
    this.shutouts = goalies.filter(
      (goalie) => goalie.status === GoalieGameStatus.Shutout
    ).length;
    this.overtimeLosses = goalies.filter(
      (goalie) => goalie.status === GoalieGameStatus.OverTime
    ).length;
    this.totalPoolPoints = goalies.reduce(
      (acc, goalie) => acc + goalie.getTotalPoolPts(settings),
      0
    );
  }

  numberOfGame: number;
  goals: number;
  assists: number;
  wins: number;
  shutouts: number;
  overtimeLosses: number;
  totalPoolPoints: number;
}

export class TotalDailyPoints {
  constructor(
    participant: string,
    forwards: SkaterDailyInfo[],
    defense: SkaterDailyInfo[],
    goalies: GoalieDailyInfo[],
    settings: PoolSettings
  ) {
    this.participant = participant;
    this.forwards = new SkatersDailyTotalPoints(
      forwards,
      settings.forwards_settings
    );
    this.defense = new SkatersDailyTotalPoints(
      defense,
      settings.defense_settings
    );
    this.goalies = new GoaliesDailyTotalPoints(
      goalies,
      settings.goalies_settings
    );

    this.numberOfGames =
      this.forwards.numberOfGame +
      this.defense.numberOfGame +
      this.goalies.numberOfGame;

    this.totalPoolPoints =
      this.forwards.totalPoolPoints +
      this.defense.totalPoolPoints +
      this.goalies.totalPoolPoints;
  }

  participant: string;
  forwards: SkatersDailyTotalPoints;
  defense: SkatersDailyTotalPoints;
  goalies: GoaliesDailyTotalPoints;
  numberOfGames: number;
  totalPoolPoints: number;
}

export class SkaterDailyInfo {
  constructor(playerId: number, played: boolean) {
    this.id = playerId;
    this.played = played;
    this.goals = 0;
    this.assists = 0;
    this.shootoutGoals = 0;
    this.poolPoints = 0;
  }

  id: number;
  played: boolean;

  goals: number;
  assists: number;
  shootoutGoals: number;
  poolPoints: number;

  public getTotalPoolPts(skaters_settings: SkaterSettings): number {
    let totalPoints =
      this.goals * skaters_settings.points_per_goals +
      this.assists * skaters_settings.points_per_assists +
      this.shootoutGoals * skaters_settings.points_per_shootout_goals;

    if (this.goals >= 3) {
      totalPoints += skaters_settings.points_per_hattricks;
    }
    return totalPoints;
  }
}

export enum GoalieGameStatus {
  Win = "W",
  OverTime = "OT",
  Shutout = "SO",
  Losses = "L",
}

export class GoalieDailyInfo {
  constructor(playerId: number, played: boolean) {
    this.id = playerId;
    this.played = played;
    this.goals = 0;
    this.assists = 0;
    this.status = null;
    this.poolPoints = 0;
  }

  id: number;
  played: boolean;

  goals: number;
  assists: number;
  status: GoalieGameStatus | null;
  poolPoints: number;

  public getTotalPoolPts(settings: GoaliesSettings): number {
    let totalPoints =
      this.goals * settings.points_per_goals +
      this.assists * settings.points_per_assists;

    if (this.status !== null) {
      switch (this.status) {
        case GoalieGameStatus.Win: {
          return totalPoints + settings.points_per_wins;
        }
        case GoalieGameStatus.OverTime: {
          return totalPoints + settings.points_per_overtimes;
        }
        case GoalieGameStatus.Shutout: {
          return (
            totalPoints +
            settings.points_per_wins +
            settings.points_per_shutouts
          );
        }
      }
    }

    return totalPoints;
  }
}

const getDailySkaterStatsWithCumulative = (
  skaterPoints: SkaterPoints | null,
  playerId: string,
  skaters_settings: SkaterSettings
): SkaterDailyInfo => {
  // Get the daily score informations based on the pool informations.
  if (skaterPoints === null) {
    return new SkaterDailyInfo(Number(playerId), false);
  }
  const skaterDailyStats = new SkaterDailyInfo(Number(playerId), true);

  skaterDailyStats.goals = skaterPoints.G;
  skaterDailyStats.assists = skaterPoints.A;
  skaterDailyStats.shootoutGoals = skaterPoints.SOG ?? 0;
  skaterDailyStats.poolPoints =
    skaterDailyStats.getTotalPoolPts(skaters_settings);

  return skaterDailyStats;
};

const getDailySkaterStatsWithDailyStats = (
  leaders: DailyLeaders,
  playerId: string,
  skaters_settings: SkaterSettings
): SkaterDailyInfo => {
  // Get the daily score informations based on the daily stats informations.
  // This is usually being called when the daily stats have not been cumulated yet in the pool.
  const i = leaders.skaters.findIndex((p) => p.id === Number(playerId));
  if (i > -1) {
    const skaterDailyStats = new SkaterDailyInfo(Number(playerId), true);

    skaterDailyStats.goals = leaders.skaters[i].stats.goals;
    skaterDailyStats.assists = leaders.skaters[i].stats.assists;
    skaterDailyStats.shootoutGoals = leaders.skaters[i].stats.shootoutGoals;
    skaterDailyStats.poolPoints =
      skaterDailyStats.getTotalPoolPts(skaters_settings);

    return skaterDailyStats;
  }

  return new SkaterDailyInfo(
    Number(playerId),
    leaders.played.includes(Number(playerId))
  );
};

const getDailyGoalieStatsWithCumulative = (
  goaliePoints: GoaliePoints | null,
  playerId: string,
  settings: GoaliesSettings
): GoalieDailyInfo => {
  // Get the daily score informations based on the pool informations.
  if (goaliePoints === null) {
    return new GoalieDailyInfo(Number(playerId), false);
  }
  const goalieDailyStats = new GoalieDailyInfo(Number(playerId), true);

  goalieDailyStats.goals = goaliePoints.G;
  goalieDailyStats.assists = goaliePoints.A;

  if (goaliePoints.OT) {
    goalieDailyStats.status = GoalieGameStatus.OverTime;
  } else if (goaliePoints.SO) {
    goalieDailyStats.status = GoalieGameStatus.Shutout;
  } else if (goaliePoints.W) {
    goalieDailyStats.status = GoalieGameStatus.Win;
  } else {
    goalieDailyStats.status = GoalieGameStatus.Losses;
  }
  goalieDailyStats.poolPoints = goalieDailyStats.getTotalPoolPts(settings);

  return goalieDailyStats;
};

const getDailyGoalieStatsWithDailyStats = (
  leaders: DailyLeaders,
  playerId: string,
  settings: GoaliesSettings
): GoalieDailyInfo => {
  // Get the daily score informations based on the daily stats informations.
  // This is usually being called when the daily stats have not been cumulated yet in the pool.
  const i = leaders.goalies.findIndex((p) => p.id === Number(playerId));
  if (i > -1) {
    const goalieDailyStats = new GoalieDailyInfo(Number(playerId), true);

    goalieDailyStats.goals = leaders.goalies[i].stats.goals;
    goalieDailyStats.assists = leaders.goalies[i].stats.assists;

    if (leaders.goalies[i].stats.decision !== null) {
      switch (leaders.goalies[i].stats.decision) {
        case "W": {
          goalieDailyStats.status =
            leaders.goalies[i].stats.savePercentage === 1.0
              ? GoalieGameStatus.Shutout
              : GoalieGameStatus.Win;
          break;
        }
        case "L": {
          goalieDailyStats.status = GoalieGameStatus.Losses;
          break;
        }
        case "O": {
          goalieDailyStats.status = GoalieGameStatus.OverTime;
          break;
        }
      }
    }

    goalieDailyStats.poolPoints = goalieDailyStats.getTotalPoolPts(settings);

    return goalieDailyStats;
  }

  return new GoalieDailyInfo(
    Number(playerId),
    leaders.played.includes(Number(playerId))
  );
};

const getDailySkatersStatsWithCumulative = (
  rosterInfo: Record<string, SkaterPoints | null>,
  skaters_settings: SkaterSettings
): SkaterDailyInfo[] =>
  // The skaters stats is stored into the pool. We can display the informations stored in the pool this will match what is cumulated in the pool.
  Object.keys(rosterInfo).map((key) => {
    return getDailySkaterStatsWithCumulative(
      rosterInfo[key],
      key,
      skaters_settings
    );
  });

const getDailySkaterStatsWithDailyLeaders = (
  rosterInfo: Record<string, SkaterPoints | null>,
  leaders: DailyLeaders,
  skaters_settings: SkaterSettings
): SkaterDailyInfo[] =>
  // The skaters stats is not yet stored into the pool information,
  // we can take the information from the daiLeaders that is being update live.
  Object.keys(rosterInfo).map((key) => {
    return getDailySkaterStatsWithDailyStats(leaders, key, skaters_settings);
  });

const getDailyGoaliesStatsWithCumulative = (
  rosterInfo: Record<string, GoaliePoints | null>,
  settings: GoaliesSettings
): GoalieDailyInfo[] =>
  // The goalies stats is stored into the pool. We can display the informations stored in the pool this will match what is cumulated in the pool.
  Object.keys(rosterInfo).map((key) => {
    return getDailyGoalieStatsWithCumulative(rosterInfo[key], key, settings);
  });

const getDailyGoaliesStatsWithDailyLeaders = (
  rosterInfo: Record<string, GoaliePoints | null>,
  leaders: DailyLeaders,
  settings: GoaliesSettings
): GoalieDailyInfo[] =>
  // The goalies stats is not yet stored into the pool information,
  // we can take the information from the daiLeaders that is being update live.
  Object.keys(rosterInfo).map((key) => {
    return getDailyGoalieStatsWithDailyStats(leaders, key, settings);
  });

const PoolContext = createContext<PoolContextProps | undefined>(undefined);

export const usePoolContext = (): PoolContextProps => {
  const context = useContext(PoolContext);
  if (!context) {
    throw new Error("usePoolContext must be used within a DateProvider");
  }
  return context;
};

interface PoolContextProviderProps {
  children: ReactNode;
  pool: Pool;
}

const getPlayersOwner = (poolInfo: Pool) => {
  if (poolInfo.participants === null) {
    return {};
  }

  const playersOwner: Record<number, string> = {};
  for (let i = 0; i < poolInfo.participants.length; i += 1) {
    const participant = poolInfo.participants[i].id;

    poolInfo.context?.pooler_roster[participant].chosen_forwards.map(
      (playerId) => (playersOwner[playerId] = participant)
    );
    poolInfo.context?.pooler_roster[participant].chosen_defenders.map(
      (playerId) => (playersOwner[playerId] = participant)
    );
    poolInfo.context?.pooler_roster[participant].chosen_goalies.map(
      (playerId) => (playersOwner[playerId] = participant)
    );
    poolInfo.context?.pooler_roster[participant].chosen_reservists.map(
      (playerId) => (playersOwner[playerId] = participant)
    );
  }

  return playersOwner;
};

const findLastDateInDb = (pool: Pool | null) => {
  // This function looks if there is a date player's stats that have already be stored in the local database.
  // If so a day will be sent to retrieve the data.
  if (!pool || !pool.context || !pool.context.score_by_day) {
    return null;
  }

  // Sort the keys (dates) in descending order
  const sortedDates = Object.keys(pool.context.score_by_day).sort((a, b) =>
    a.localeCompare(b)
  );

  return sortedDates[sortedDates.length - 1];
};

export const hasPoolPrivilege = (
  user: string | undefined,
  pool: Pool
): boolean => {
  return user === pool.owner || pool.settings.assistants.includes(user ?? "");
};

const mergeScoreByDay = (mergedPoolInfo: Pool, poolDb: Pool) => {
  // Merge score_by_day field. The pool database fields are being overided by the pool information.
  if (mergedPoolInfo.context === null) {
    mergedPoolInfo.context = poolDb.context;
    return;
  }

  mergedPoolInfo.context.score_by_day = {
    ...poolDb.context?.score_by_day,
    ...mergedPoolInfo.context.score_by_day,
  };
};

export const fetchPoolInfo = async (name: string): Promise<Pool | string> => {
  // @ts-ignore
  const poolDb: Pool = await db.pools.get({ name: name });

  const lastFormatDate = findLastDateInDb(poolDb);

  console.log(`Last format date ${lastFormatDate} found in indexed db.`);
  let res;

  // TODO: risk here since we used the start date of the pool stored locally in database.
  // It could be corrupt or changed. Should process that server side.
  res = await fetch(
    lastFormatDate
      ? `/api-rust/pool/${name}/${poolDb.season_start}/${lastFormatDate}`
      : `/api-rust/pool/${name}`
  );

  if (!res.ok) {
    return await res.text();
  }

  let data: Pool = await res.json();

  if (poolDb) {
    // If we detect that the pool stored in the database date_updated field does not match the one
    // from the server, we will force a complete update.
    if (data.date_updated !== poolDb.date_updated) {
      res = await fetch(`/api-rust/pool/${name}`);

      if (!res.ok) {
        return await res.text();
      }

      data = await res.json();
    } else if (lastFormatDate) {
      // This is in the case we called the pool information for only a range of date since the rest of the date
      // were already stored and valid in the client database, we then only merge the needed data of the client database pool.
      mergeScoreByDay(data, poolDb);
      console.log("merging score in database.");
      // TODO hash the results and compare with server hash to determine if an update is needed.
      // If we do that, we could remove the logic of comparing the field date_updated above that would be cleaner and more robust.
    }

    data.id = poolDb.id;
  }

  // @ts-ignore
  db.pools.put(data, "name");
  return data;
};

export const PoolContextProvider: React.FC<PoolContextProviderProps> = ({
  children,
  pool,
}) => {
  const [poolInfo, setPoolInfo] = useState<Pool>(pool);
  const { dailyLeaders } = useDailyLeadersContext();
  const { currentDate, querySelectedDate } = useDateContext();
  const [dailyPointsMade, setDailyPointsMade] =
    useState<DailyPoolPointsMade | null>(null);

  const lastFormatDate = findLastDateInDb(poolInfo);
  const dateOfInterest = querySelectedDate
    ? querySelectedDate
    : lastFormatDate
    ? lastFormatDate
    : format(currentDate, "yyyy-MM-dd");

  const getPoolDictUsers = (pool: Pool) =>
    pool.participants.reduce((acc: Record<string, PoolUser>, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

  const [dictUsers, setDictUsers] = useState<Record<string, PoolUser>>(
    getPoolDictUsers(pool)
  );

  const getInitialSelectedParticipant = (): string => {
    // Return the initial selected participant.
    if (poolInfo.participants === null || poolInfo.participants.length === 0)
      return "";

    const queryParams = new URLSearchParams(window.location.search);
    const initialSelectedParticipant = queryParams.get("selectedParticipant");

    if (
      initialSelectedParticipant === null ||
      !poolInfo.participants.some(
        (user) => user.name === initialSelectedParticipant
      )
    )
      return poolInfo.participants[0].name;

    return initialSelectedParticipant;
  };
  const router = useRouter();
  const [selectedParticipant, setSelectedParticipant] = React.useState<string>(
    getInitialSelectedParticipant()
  );
  const [selectedPoolUser, setSelectedPoolUser] = React.useState<PoolUser>(
    poolInfo.participants.find((user) => user.name === selectedParticipant) ??
      poolInfo.participants[0]
  );
  const [playersOwner, setPlayersOwner] = React.useState<
    Record<number, string>
  >(getPlayersOwner(poolInfo));
  const [cumulated, setCumulated] = React.useState(false);

  const updatePlayersOwner = (poolInfo: Pool) => {
    setPlayersOwner(getPlayersOwner(poolInfo));
  };
  const updateSelectedParticipant = (participant: string) => {
    setSelectedParticipant(participant);
    setSelectedPoolUser(
      poolInfo.participants.find((user) => user.name === participant) ??
        poolInfo.participants[0]
    );
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set("selectedParticipant", participant);
    router.push(`/pool/${poolInfo.name}/?${queryParams.toString()}`);
  };

  React.useEffect(() => {
    const dayInfo = poolInfo.context?.score_by_day?.[dateOfInterest];

    if (!dayInfo && !dailyLeaders) {
      // If both are not defined, it means that it should be previewing the roster.
      return;
    }

    const forwardsDailyStatsTemp: Record<string, SkaterDailyInfo[]> = {};
    const defendersDailyStatsTemp: Record<string, SkaterDailyInfo[]> = {};
    const goaliesDailyStatsTemp: Record<string, GoalieDailyInfo[]> = {};
    const totalDailyPointsTemp: TotalDailyPoints[] = [];
    let cumulated = false;

    for (var i = 0; i < poolInfo.participants.length; i += 1) {
      // Parse all participants daily locked roster to query its daily stats.
      const user = poolInfo.participants[i];

      if (dayInfo && dayInfo[user.id].is_cumulated) {
        console.log(
          `processing daily ranking for ${dateOfInterest} using cumulative.`
        );
        cumulated = true;
        // the information is cumulated in the pool directly get it from there since it
        // is what is being used to display the cumulative page.
        forwardsDailyStatsTemp[user.id] = getDailySkatersStatsWithCumulative(
          dayInfo[user.id].roster.F,
          poolInfo.settings.forwards_settings
        );
        defendersDailyStatsTemp[user.id] = getDailySkatersStatsWithCumulative(
          dayInfo[user.id].roster.D,
          poolInfo.settings.defense_settings
        );
        goaliesDailyStatsTemp[user.id] = getDailyGoaliesStatsWithCumulative(
          dayInfo[user.id].roster.G,
          poolInfo.settings.goalies_settings
        );
      } else if (dailyLeaders && dayInfo) {
        console.log(
          `processing daily ranking for ${dateOfInterest} using daily_leaders.`
        );

        // The players stats is not yet stored into the pool information
        // we can take the information from the daiLeaders that is being update live.
        forwardsDailyStatsTemp[user.id] = getDailySkaterStatsWithDailyLeaders(
          dayInfo[user.id].roster.F,
          dailyLeaders,
          poolInfo.settings.forwards_settings
        );
        defendersDailyStatsTemp[user.id] = getDailySkaterStatsWithDailyLeaders(
          dayInfo[user.id].roster.D,
          dailyLeaders,
          poolInfo.settings.defense_settings
        );
        goaliesDailyStatsTemp[user.id] = getDailyGoaliesStatsWithDailyLeaders(
          dayInfo[user.id].roster.G,
          dailyLeaders,
          poolInfo.settings.goalies_settings
        );
      }
      totalDailyPointsTemp.push(
        new TotalDailyPoints(
          user.name,
          forwardsDailyStatsTemp[user.id],
          defendersDailyStatsTemp[user.id],
          goaliesDailyStatsTemp[user.id],
          poolInfo.settings
        )
      );
    }

    setDailyPointsMade({
      dateOfInterest,
      cumulated,
      forwardsDailyStats: forwardsDailyStatsTemp,
      defendersDailyStats: defendersDailyStatsTemp,
      goaliesDailyStats: goaliesDailyStatsTemp,
      totalDailyPoints: totalDailyPointsTemp,
    });
  }, [dateOfInterest]);

  const updatePoolInfo = (newPoolInfo: Pool) => {
    // @ts-ignore
    db.pools.get({ name: newPoolInfo.name }).then((poolDb) => {
      mergeScoreByDay(newPoolInfo, poolDb);
      setPoolInfo(newPoolInfo);
      newPoolInfo.id = poolDb.id;
      // @ts-ignore
      db.pools.put(newPoolInfo, "name");
    });
    updatePlayersOwner(newPoolInfo);
    setDictUsers(getPoolDictUsers(newPoolInfo));
  };

  const contextValue: PoolContextProps = {
    selectedParticipant,
    selectedPoolUser,
    updateSelectedParticipant,
    lastFormatDate: lastFormatDate,
    playersOwner,
    updatePlayersOwner,
    poolInfo,
    updatePoolInfo,
    dictUsers,
    dailyPointsMade,
  };

  return (
    <PoolContext.Provider value={contextValue}>{children}</PoolContext.Provider>
  );
};
