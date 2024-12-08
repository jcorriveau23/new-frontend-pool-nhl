import { DailyPoolPointsMade, TotalDailyPoints } from "@/context/pool-context";
import { GoaliesSettings, Pool, PoolSettings, SkaterSettings } from "@/data/pool/model";

export enum PlayerStatus {
    // Tells if the player is in the alignment at that date.
    InAlignment = "Active",
  
    // Tells if the player is currently a reservists at that date.
    IsReservists = "Reservist",
  
    // Tells if the player points is considered or not.
    // We can ignore the worst X players in the pool settings.
    PointsIgnored = "Ignored",
  
    // Player traded, no more owned by the player.
    Traded = "Traded",
  }
  
  export class SkaterInfo {
    constructor(playerId: number, status: PlayerStatus) {
      this.id = playerId;
      this.numberOfGame = 0;
      this.goals = 0;
      this.assists = 0;
      this.hattricks = 0;
      this.shootoutGoals = 0;
      this.poolPoints = 0;
      this.status = status;
    }
  
    id: number;
  
    numberOfGame: number;
    goals: number;
    assists: number;
    hattricks: number;
    shootoutGoals: number;
    poolPoints: number;
  
    status: PlayerStatus;
  
    public getTotalPoints(): number {
      return this.goals + this.assists;
    }
  
    public getTotalPoolPoints(skaters_settings: SkaterSettings): number {
      return (
        this.goals * skaters_settings.points_per_goals +
        this.assists * skaters_settings.points_per_assists +
        this.hattricks * skaters_settings.points_per_hattricks +
        this.shootoutGoals * skaters_settings.points_per_shootout_goals
      );
    }
  }
  
  export class GoalieInfo {
    constructor(playerId: number, status: PlayerStatus) {
      this.id = playerId;
      this.numberOfGame = 0;
      this.goals = 0;
      this.assists = 0;
      this.wins = 0;
      this.shutouts = 0;
      this.overtimeLosses = 0;
      this.poolPoints = 0;
      this.status = status;
    }
    id: number;
  
    // The number of game and stats of the skaters.
    numberOfGame: number;
    goals: number;
    assists: number;
    wins: number;
    shutouts: number;
    overtimeLosses: number;
    poolPoints: number;
  
    status: PlayerStatus;
  
    public getTotalPoolPoints(settings: GoaliesSettings): number {
      return (
        this.goals * settings.points_per_goals +
        this.assists * settings.points_per_assists +
        this.wins * settings.points_per_wins +
        this.shutouts * settings.points_per_shutouts +
        this.overtimeLosses * settings.points_per_overtimes
      );
    }
  }
  
  export class ParticipantsRoster {
    constructor() {
      this.forwards = [];
      this.defense = [];
      this.goalies = [];
    }
    forwards: SkaterInfo[];
    defense: SkaterInfo[];
    goalies: GoalieInfo[];
  }
  
  export class SkaterTotal {
    constructor(skaters: SkaterInfo[], skaters_settings: SkaterSettings) {
      this.numberOfGame = skaters
        .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
        .reduce((acc, skater) => acc + skater.numberOfGame, 0);
      this.goals = skaters
        .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
        .reduce((acc, skater) => acc + skater.goals, 0);
      this.assists = skaters
        .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
        .reduce((acc, skater) => acc + skater.assists, 0);
      this.hattricks = skaters
        .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
        .reduce((acc, skater) => acc + skater.hattricks, 0);
      this.shootoutGoals = skaters
        .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
        .reduce((acc, skater) => acc + skater.shootoutGoals, 0);
      this.totalPoints = this.getTotalPoints();
      this.totalPoolPoints = this.getTotalPoolPoints(skaters_settings);
    }
    numberOfGame: number;
    goals: number;
    assists: number;
    hattricks: number;
    shootoutGoals: number;
    totalPoints: number;
    totalPoolPoints: number;
  
    public getTotalPoints(): number {
      return this.goals + this.assists;
    }
  
    public getTotalPoolPoints(skaters_settings: SkaterSettings): number {
      return (
        this.goals * skaters_settings.points_per_goals +
        this.assists * skaters_settings.points_per_assists +
        this.hattricks * skaters_settings.points_per_hattricks +
        this.shootoutGoals * skaters_settings.points_per_shootout_goals
      );
    }
  }
  
  export class GoalieTotal {
    constructor(goalies: GoalieInfo[], settings: GoaliesSettings) {
      this.numberOfGame = goalies
        .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
        .reduce((acc, goalie) => acc + goalie.numberOfGame, 0);
      this.goals = goalies
        .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
        .reduce((acc, goalie) => acc + goalie.goals, 0);
      this.assists = goalies
        .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
        .reduce((acc, goalie) => acc + goalie.assists, 0);
      this.wins = goalies
        .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
        .reduce((acc, goalie) => acc + goalie.wins, 0);
      this.shutouts = goalies
        .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
        .reduce((acc, goalie) => acc + goalie.shutouts, 0);
      this.overtimeLosses = goalies
        .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
        .reduce((acc, goalie) => acc + goalie.overtimeLosses, 0);
      this.totalPoolPoints = this.getTotalPoolPoints(settings);
    }
    numberOfGame: number;
    goals: number;
    assists: number;
    wins: number;
    shutouts: number;
    overtimeLosses: number;
    totalPoolPoints: number;
  
    public getTotalPoolPoints(settings: GoaliesSettings): number {
      return (
        this.goals * settings.points_per_goals +
        this.assists * settings.points_per_assists +
        this.wins * settings.points_per_wins +
        this.shutouts * settings.points_per_shutouts +
        this.overtimeLosses * settings.points_per_overtimes
      );
    }
  }
  
  export class TotalRanking {
    constructor(
      userName: string,
      forwards: SkaterInfo[],
      defense: SkaterInfo[],
      goalies: GoalieInfo[],
      DailyPoolPointsMade: TotalDailyPoints | null,
      settings: PoolSettings
    ) {
      this.participant = userName;
      this.forwards = new SkaterTotal(forwards, settings.forwards_settings);
      this.defense = new SkaterTotal(defense, settings.defense_settings);
      this.goalies = new GoalieTotal(goalies, settings.goalies_settings);
      this.numberOfGames = DailyPoolPointsMade?.numberOfGames ?? null;
      this.totalPoolPoints = DailyPoolPointsMade?.totalPoolPoints ?? null;
    }
    participant: string;
  
    forwards: SkaterTotal;
    defense: SkaterTotal;
    goalies: GoalieTotal;
    numberOfGames: number | null;
    totalPoolPoints: number | null;
  
    public getTotalPoolPoints(): number {
      return (
        this.forwards.totalPoolPoints +
        this.defense.totalPoolPoints +
        this.goalies.totalPoolPoints
      );
    }
  }

  export const calculatePoolStats = (poolInfo: Pool, poolStartDate: Date, poolSelectedEndDate: Date, dailyPointsMade: DailyPoolPointsMade | null): [Record<
    string,
    ParticipantsRoster
  > | null, TotalRanking[] | null ] => {
    if (poolInfo.participants === null || poolInfo.context === null) {
      return [{}, []] 
    }
    const stats: Record<string, ParticipantsRoster> = {};
    const rank: TotalRanking[] = [];
    // Calculate all the points made by each players and cumulate the total points of each poolers
    // to be able to fill up the tables that display pooler points between the beginning of the season and the selected date.

    // First Add the players that are currently owned by the pooler either in reservists or in the alignment.
    for (let i = 0; i < poolInfo.participants.length; i += 1) {
      const participant = poolInfo.participants[i].id;

      stats[participant] = new ParticipantsRoster();

      // Forwards (In the alignment)
      for (
        let j = 0;
        j <
        poolInfo.context?.pooler_roster[participant].chosen_forwards.length;
        j += 1
      ) {
        const playerId =
          poolInfo.context?.pooler_roster[participant].chosen_forwards[j];

        stats[participant].forwards.push(
          new SkaterInfo(playerId, PlayerStatus.InAlignment)
        );
      }

      // Defenses (In the alignment)
      for (
        let j = 0;
        j <
        poolInfo.context?.pooler_roster[participant].chosen_defenders.length;
        j += 1
      ) {
        const playerId =
          poolInfo.context?.pooler_roster[participant].chosen_defenders[j];

        stats[participant].defense.push(
          new SkaterInfo(playerId, PlayerStatus.InAlignment)
        );
      }

      // Goalies (In the alignment)
      for (
        let j = 0;
        j <
        poolInfo.context?.pooler_roster[participant].chosen_goalies.length;
        j += 1
      ) {
        const playerId =
          poolInfo.context?.pooler_roster[participant].chosen_goalies[j];

        stats[participant].goalies.push(
          new GoalieInfo(playerId, PlayerStatus.InAlignment)
        );
      }
    }

    console.log(
      `Calculating cumulative information from ${poolStartDate} to ${poolSelectedEndDate}`
    );

    for (
      let j = new Date(poolStartDate);
      j <= poolSelectedEndDate;
      j.setDate(j.getDate() + 1)
    ) {
      const jDateKey = j.toISOString().slice(0, 10);

      for (let i = 0; i < poolInfo.participants.length; i += 1) {
        const participantId = poolInfo.participants[i].id;

        if (
          poolInfo.context?.score_by_day &&
          jDateKey in poolInfo.context.score_by_day
        ) {
          // Forwards
          Object.keys(
            poolInfo.context?.score_by_day[jDateKey][participantId].roster.F
          ).map((key) => {
            if (
              poolInfo.context === null ||
              poolInfo.context.score_by_day === null
            ) {
              return null;
            }
            const player =
              poolInfo.context.score_by_day[jDateKey][participantId].roster.F[
                key
              ];
            if (player) {
              const playerId = Number(key);

              let index = stats[participantId].forwards.findIndex(
                (p) => p.id === playerId
              );

              if (index === -1) {
                const indexReservist = poolInfo.context.pooler_roster[
                  participantId
                ].chosen_reservists.findIndex((p) => p === playerId);

                index =
                  stats[participantId].forwards.push(
                    new SkaterInfo(
                      playerId,
                      indexReservist >= 0
                        ? PlayerStatus.IsReservists
                        : PlayerStatus.Traded
                    )
                  ) - 1;
              }

              stats[participantId].forwards[index].numberOfGame += 1;
              stats[participantId].forwards[index].goals += player.G;
              stats[participantId].forwards[index].assists += player.A;
              stats[participantId].forwards[index].hattricks +=
                player.G >= 3 ? 1 : 0;
              stats[participantId].forwards[index].shootoutGoals +=
                player.SOG ?? 0;
            }
          });

          // Defenses
          Object.keys(
            poolInfo.context.score_by_day[jDateKey][participantId].roster.D
          ).map((key) => {
            if (
              poolInfo.context === null ||
              poolInfo.context.score_by_day === null
            ) {
              return null;
            }
            const player =
              poolInfo.context.score_by_day[jDateKey][participantId].roster.D[
                key
              ];
            if (player) {
              const playerId = Number(key);

              let index = stats[participantId].defense.findIndex(
                (p) => p.id === playerId
              );

              if (index === -1) {
                const indexReservist = poolInfo.context.pooler_roster[
                  participantId
                ].chosen_reservists.findIndex((p) => p === playerId);

                index =
                  stats[participantId].defense.push(
                    new SkaterInfo(
                      playerId,
                      indexReservist >= 0
                        ? PlayerStatus.IsReservists
                        : PlayerStatus.Traded
                    )
                  ) - 1;
              }

              stats[participantId].defense[index].numberOfGame += 1;
              stats[participantId].defense[index].goals += player.G;
              stats[participantId].defense[index].assists += player.A;
              stats[participantId].defense[index].hattricks +=
                player.G >= 3 ? 1 : 0;
              stats[participantId].defense[index].shootoutGoals +=
                player.SOG ?? 0;
            }
          });

          // Goalies
          Object.keys(
            poolInfo.context.score_by_day[jDateKey][participantId].roster.G
          ).map((key) => {
            if (
              poolInfo.context === null ||
              poolInfo.context.score_by_day === null
            ) {
              return null;
            }
            const player =
              poolInfo.context.score_by_day[jDateKey][participantId].roster.G[
                key
              ];
            if (player) {
              const playerId = Number(key);

              let index = stats[participantId].goalies.findIndex(
                (p) => p.id === playerId
              );

              if (index === -1) {
                const indexReservist = poolInfo.context.pooler_roster[
                  participantId
                ].chosen_reservists.findIndex((p) => p === playerId);

                index =
                  stats[participantId].goalies.push(
                    new GoalieInfo(
                      playerId,
                      indexReservist >= 0
                        ? PlayerStatus.IsReservists
                        : PlayerStatus.Traded
                    )
                  ) - 1;
              }

              stats[participantId].goalies[index].numberOfGame += 1;
              stats[participantId].goalies[index].goals += player.G;
              stats[participantId].goalies[index].assists += player.A;
              stats[participantId].goalies[index].wins += player.W ? 1 : 0;
              stats[participantId].goalies[index].shutouts += player.SO
                ? 1
                : 0;
              stats[participantId].goalies[index].overtimeLosses += player.OT
                ? 1
                : 0;
            }
          });
        }
      }
    }

    // Now Create the Ranking table data class.
    // This require to cumulate the total points into each players base on the pool settings.
    for (let i = 0; i < poolInfo.participants.length; i += 1) {
      const user = poolInfo.participants[i];

      for (let j = 0; j < stats[user.id].forwards.length; j += 1) {
        stats[user.id].forwards[j].poolPoints = stats[user.id].forwards[
          j
        ].getTotalPoolPoints(poolInfo.settings.forwards_settings);
      }

      for (let j = 0; j < stats[user.id].defense.length; j += 1) {
        stats[user.id].defense[j].poolPoints = stats[user.id].defense[
          j
        ].getTotalPoolPoints(poolInfo.settings.defense_settings);
      }

      for (let j = 0; j < stats[user.id].goalies.length; j += 1) {
        stats[user.id].goalies[j].poolPoints = stats[user.id].goalies[
          j
        ].getTotalPoolPoints(poolInfo.settings.goalies_settings);
      }

      // Sort and change state of players that should be considered ignore from the settings.
      stats[user.id].forwards.sort((a, b) => b.poolPoints - a.poolPoints);
      stats[user.id].defense.sort((a, b) => b.poolPoints - a.poolPoints);
      stats[user.id].goalies.sort((a, b) => b.poolPoints - a.poolPoints);

      // Now change the ignore settings base on the
      for (
        let i =
          stats[user.id].forwards.length -
          (poolInfo.settings.ignore_x_worst_players?.forwards ?? 0);
        i < stats[user.id].forwards.length;
        i += 1
      ) {
        stats[user.id].forwards[i].status = PlayerStatus.PointsIgnored;
      }

      for (
        let i =
          stats[user.id].defense.length -
          (poolInfo.settings.ignore_x_worst_players?.defense ?? 0);
        i < stats[user.id].defense.length;
        i += 1
      ) {
        stats[user.id].defense[i].status = PlayerStatus.PointsIgnored;
      }

      for (
        let i =
          stats[user.id].goalies.length -
          (poolInfo.settings.ignore_x_worst_players?.goalies ?? 0);
        i < stats[user.id].goalies.length;
        i += 1
      ) {
        stats[user.id].goalies[i].status = PlayerStatus.PointsIgnored;
      }

      // Find daily points made using the hook.
      const totalDailyPoints = dailyPointsMade?.totalDailyPoints.find(
        (t) => t.participant === user.name
      );
      const totalPoolPointsMade = rank.push(
        new TotalRanking(
          user.name,
          stats[user.id].forwards,
          stats[user.id].defense,
          stats[user.id].goalies,
          totalDailyPoints ?? null,
          poolInfo.settings
        )
      );
    }

    rank.sort((a, b) => b.getTotalPoolPoints() - a.getTotalPoolPoints());
    return [stats, rank];
  };