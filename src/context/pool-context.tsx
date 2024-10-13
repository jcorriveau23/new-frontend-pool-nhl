/*
Module that share context related to the selected pool.
*/
"use client";
import { Pool, PoolUser } from "@/data/pool/model";
import React, { createContext, useContext, ReactNode, useState } from "react";
import { useRouter } from "@/navigation";
import { db } from "@/db";

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
    lastFormatDate: findLastDateInDb(poolInfo),
    playersOwner,
    updatePlayersOwner,
    poolInfo,
    updatePoolInfo,
    dictUsers,
  };

  return (
    <PoolContext.Provider value={contextValue}>{children}</PoolContext.Provider>
  );
};
