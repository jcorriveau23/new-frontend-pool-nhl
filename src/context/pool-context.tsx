/*
Module that share context related to the selected pool.
*/
"use client";
import { Pool } from "@/data/pool/model";
import { UserData } from "@/data/user/model";
import React, { createContext, useContext, ReactNode, useState } from "react";
import { useRouter } from "@/navigation";
import { db } from "@/db";

export interface PoolContextProps {
  // keeps the information of which participant is selected across the pool.
  selectedParticipant: string;
  updateSelectedParticipant: (participant: string) => void;

  // Map the player id to its pool owner.
  playersOwner: Record<number, string>;
  updatePlayersOwner: (poolInfo: Pool) => void;

  // Map the user id to its user name.
  dictUsers: Record<string, string>;
  updateUsers: (users: UserData[]) => void;

  poolInfo: Pool;
  updatePoolInfo: (newPoolInfo: Pool) => void;

  users: UserData[];
}

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
  users: UserData[];
}

const getPlayersOwner = (poolInfo: Pool) => {
  if (poolInfo.participants === null) {
    return {};
  }

  const playersOwner: Record<number, string> = {};
  for (let i = 0; i < poolInfo.participants.length; i += 1) {
    const participant = poolInfo.participants[i];
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

  const currentDate = new Date();
  const seasonEndDate = new Date(pool.season_end);
  // Start at the current date or at the season end date if the current date is after the season end date.
  const tempDate = currentDate > seasonEndDate ? seasonEndDate : currentDate;

  // TODO: a cleaner logic would be to always look from the current date to the from date
  let i = 200; // Will look into the past 200 days to find the last date from now.

  do {
    const fTempDate = tempDate.toISOString().slice(0, 10);
    if (fTempDate in pool.context.score_by_day) {
      return fTempDate;
    }

    tempDate.setDate(tempDate.getDate() - 1);
    i -= 1;
  } while (i > 0);

  return null;
};

const getUserName = (users: UserData[]) => {
  const dictUsersTmp: Record<string, string> = {};
  users.map((u: any) => {
    dictUsersTmp[u._id] = u.name;
  });

  return dictUsersTmp;
};

export const hasPoolPrivilege = (
  user: string | undefined,
  pool: Pool
): boolean => {
  return user === pool.owner || pool.settings.assistants.includes(user ?? "");
};

const mergeScoreByDay = (mergedPoolInfo: Pool, poolDb: Pool) => {
  console.log("merged");
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
  users,
}) => {
  const [poolInfo, setPoolInfo] = useState<Pool>(pool);

  const getInitialSelectedParticipant = (): string => {
    // Return the initial selected participant.
    if (poolInfo.participants === null || poolInfo.participants.length === 0)
      return "";

    const queryParams = new URLSearchParams(window.location.search);
    const initialSelectedParticipant = queryParams.get("selectedParticipant");

    if (
      initialSelectedParticipant === null ||
      !poolInfo.participants.includes(initialSelectedParticipant)
    )
      return poolInfo.participants[0];

    return initialSelectedParticipant;
  };
  const router = useRouter();
  const [selectedParticipant, setSelectedParticipant] = React.useState<string>(
    getInitialSelectedParticipant()
  );
  const [playersOwner, setPlayersOwner] = React.useState<
    Record<number, string>
  >(getPlayersOwner(poolInfo));

  const [dictUsers, setDictUsers] = React.useState<Record<string, string>>(
    getUserName(users)
  );
  const updatePlayersOwner = (poolInfo: Pool) => {
    setPlayersOwner(getPlayersOwner(poolInfo));
  };
  const updateSelectedParticipant = (participant: string) => {
    setSelectedParticipant(participant);
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set("selectedParticipant", participant);
    router.push(`/pools/${poolInfo.name}/?${queryParams.toString()}`);
  };
  const updateUsers = (users: UserData[]) => {
    setDictUsers(getUserName(users));
  };

  const updatePoolInfo = (newPoolInfo: Pool) => {
    // @ts-ignore
    db.pools.get({ name: newPoolInfo.name }).then((poolDb) => {
      mergeScoreByDay(newPoolInfo, poolDb);
      setPoolInfo(newPoolInfo);
      newPoolInfo.id = poolDb.id;
      // @ts-ignore
      db.pools.put(newPoolInfo, "name");
    });
  };

  const contextValue: PoolContextProps = {
    selectedParticipant,
    updateSelectedParticipant,
    playersOwner,
    updatePlayersOwner,
    dictUsers,
    updateUsers,
    poolInfo,
    updatePoolInfo,
    users,
  };

  return (
    <PoolContext.Provider value={contextValue}>{children}</PoolContext.Provider>
  );
};
