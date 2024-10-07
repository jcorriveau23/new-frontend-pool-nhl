/*
Module that share the context of the selected date games context. 
Tells if there is a live game, also keeps the information of which teams plays against which team.

TODO: there should be a way to handle the selected date in a url param so that the state related to 
that is also server side.
*/
"use client";
import { Game, GameState } from "@/data/nhl/game";
import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useDateContext } from "./date-context";

export enum GamesNightStatus {
  // Tells the status of the games from the selected date.
  // The whole app will be able to parse the selected date.
  LIVE = 0,
  COMPLETED = 1,
  NOT_STARTED = 2,
  NO_GAMES = 3,
}

export interface GamesNightContextProps {
  gamesNightStatus: GamesNightStatus | null;
  playingAgainst: Record<number, number>;
}

const GamesNightContext = createContext<GamesNightContextProps | undefined>(
  undefined
);

export const useGamesNightContext = (): GamesNightContextProps => {
  const context = useContext(GamesNightContext);
  if (!context) {
    throw new Error("useDateContext must be used within a DateProvider");
  }
  return context;
};

interface GamesNightProviderProps {
  children: ReactNode;
}

export const GamesNightProvider: React.FC<GamesNightProviderProps> = ({
  children,
}) => {
  const { score } = useDateContext();
  const [gamesNightStatus, setGamesNightStatus] =
    React.useState<GamesNightStatus | null>(null);
  const [playingAgainst, setPlayingAgainst] = React.useState<
    Record<number, number>
  >({});

  const updateGamesNightContext = (games: Game[]) => {
    if (games?.length === 0) {
      // If the list of game is empty, we consider there is no game.
      setGamesNightStatus(GamesNightStatus.NO_GAMES);
    }
    if (
      games.some(
        (g) => g.gameState === GameState.LIVE || g.gameState === GameState.CRIT
      )
    ) {
      // If there is any live games the global night status would be LIVE.
      setGamesNightStatus(GamesNightStatus.LIVE);
    } else if (
      games.every(
        (g) =>
          g.gameState === GameState.FUT ||
          g.gameState === GameState.PRE ||
          g.gameState === GameState.PPD
      )
    ) {
      // If all games as not started, the global night status would be NOT_STARTED.
      setGamesNightStatus(GamesNightStatus.NOT_STARTED);
    } else {
      // Else all games are completed.
      setGamesNightStatus(GamesNightStatus.COMPLETED);
    }

    const playingAgainst: Record<number, number> = {};
    games.map((g) => {
      playingAgainst[g.awayTeam.id] = g.homeTeam.id;
      playingAgainst[g.homeTeam.id] = g.awayTeam.id;
    });

    setPlayingAgainst(playingAgainst);
  };
  // Update the selected date based on the query parameter.
  useEffect(() => {
    updateGamesNightContext(score?.games ?? []);
  }, [score]);

  const contextValue: GamesNightContextProps = {
    gamesNightStatus,
    playingAgainst,
  };

  return (
    <GamesNightContext.Provider value={contextValue}>
      {children}
    </GamesNightContext.Provider>
  );
};
