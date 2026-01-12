"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, ReactNode } from "react";
// Define the player interface
interface Player {
  name: string;
  position: string;
  date: string;
  type: string;
  recovery: string;
}

// Define the context interface
interface InjuredPlayersContextType {
  injuredPlayers: Record<string, Player>;
}

// Create the context
const InjuredPlayersContext = createContext<
  InjuredPlayersContextType | undefined
>(undefined);

// Provider component
export const InjuredPlayersProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  // Fetch the list of injured players
  const fetchInjuredPlayers = async (): Promise<Record<
    string,
    Player
  > | null> => {
    try {
      // Replace this URL with the actual API or data source for injured players
      console.log("fetching injured players!");
      const response = await fetch("/injured-players.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Record<string, Player> = await response.json();
      console.log(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch injured players", error);
      return {};
    }
  };

  const query = useQuery({
    queryKey: ["injury"],
    queryFn: () => {
      return fetchInjuredPlayers();
    },
    staleTime: 1000 * 60 * 60, // 60 minutes in ms
  });

  return (
    <InjuredPlayersContext.Provider
      value={{ injuredPlayers: query.data ?? {} }}
    >
      {children}
    </InjuredPlayersContext.Provider>
  );
};

// Custom hook to use the InjuredPlayersContext
export const useInjuredPlayers = () => {
  const context = useContext(InjuredPlayersContext);
  if (context === undefined) {
    throw new Error(
      "useInjuredPlayers must be used within an InjuredPlayersProvider"
    );
  }
  return context;
};
