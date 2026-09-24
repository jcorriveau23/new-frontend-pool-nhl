"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, ReactNode } from "react";
import type { InjuredPlayer } from "@/lib/injuries";

interface InjuredPlayersContextType {
  injuredPlayers: Record<string, InjuredPlayer>;
}

const InjuredPlayersContext = createContext<
  InjuredPlayersContextType | undefined
>(undefined);

// Throws on failure rather than resolving to `{}`: an empty object would be
// cached for the whole stale time as if no player were injured, where a failed
// query is retried and simply shows no injury markers in the meantime.
const fetchInjuredPlayers = async (): Promise<
  Record<string, InjuredPlayer>
> => {
  const response = await fetch("/injured-players.json");
  if (!response.ok) {
    throw new Error(`could not fetch injured players: HTTP ${response.status}`);
  }
  return response.json();
};

export const InjuredPlayersProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const query = useQuery({
    queryKey: ["injury"],
    queryFn: fetchInjuredPlayers,
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
      "useInjuredPlayers must be used within an InjuredPlayersProvider",
    );
  }
  return context;
};
