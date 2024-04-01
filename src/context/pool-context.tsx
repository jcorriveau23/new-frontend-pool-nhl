/*
Module that share context related to the selected pool.

TODO: there should be a way to hadle the selected date in a url param so that the state related to 
that is also server side.
*/
"use client";
import { Pool } from "@/data/pool/model";
import { UserData } from "@/data/user/model";
import React, { createContext, useContext, ReactNode } from "react";

export interface PoolContextProps {
  // keeps the information of which participant is selected across the pool.
  selectedParticipant: string;
  updateSelectedParticipant: (poolInfo: string) => void;

  // Map the player id to its pool owner.
  playersOwner: Record<number, string>;
  updatePlayersOwner: (poolInfo: Pool) => void;

  // Map the user id to its user name.
  dictUsers: Record<string, string>;
  updateUsers: (users: UserData[]) => void;
}

const PoolContext = createContext<PoolContextProps | undefined>(undefined);

export const usePoolContext = (): PoolContextProps => {
  const context = useContext(PoolContext);
  if (!context) {
    throw new Error("useDateContext must be used within a DateProvider");
  }
  return context;
};

interface PoolContextProviderProps {
  children: ReactNode;
  poolInfo: Pool;
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

const getUserName = (users: UserData[]) => {
  const dictUsersTmp: Record<string, string> = {};
  users.map((u: any) => {
    dictUsersTmp[u._id] = u.name;
  });

  return dictUsersTmp;
};

export const PoolContextProvider: React.FC<PoolContextProviderProps> = ({
  children,
  poolInfo,
  users,
}) => {
  const [selectedParticipant, setSelectedParticipant] = React.useState<string>(
    poolInfo.participants?.[0] ?? ""
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
  };
  const updateUsers = (users: UserData[]) => {
    setDictUsers(getUserName(users));
  };

  const contextValue: PoolContextProps = {
    selectedParticipant,
    updateSelectedParticipant,
    playersOwner,
    updatePlayersOwner,
    dictUsers,
    updateUsers,
  };

  return (
    <PoolContext.Provider value={contextValue}>{children}</PoolContext.Provider>
  );
};
