"use client";
import React from "react";

import { Game, GameState } from "@/data/nhl/game";
import { useRouter } from "@/i18n/routing";
import { TeamLogo } from "./team-logo";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  game: Game;
}

export default function GameItem(props: Props) {
  // Router hook to be able to navigate to other page.
  const router = useRouter();
  const searchParams = useSearchParams();

  const getGameTime = (startTimeUTC: string) =>
    new Date(Date.parse(startTimeUTC)).toLocaleString(navigator.language, {
      hour: "2-digit",
      minute: "2-digit",
    });

  const isLive =
    props.game.gameState === GameState.LIVE ||
    props.game.gameState === GameState.CRIT;

  const isFinal =
    props.game.gameState === GameState.OFF ||
    props.game.gameState === GameState.FINAL;

  const renderGameState = (status: GameState) => {
    /*
    Render the game status.
    */

    switch (status) {
      case GameState.LIVE:
      case GameState.CRIT: {
        return props.game && props.game.period && props.game.clock ? (
          <span className="text-destructive inline-flex items-center justify-center gap-1 font-medium">
            <span className="bg-destructive inline-flex size-1.5 animate-pulse rounded-full" />
            P{props.game.period} - {props.game.clock.timeRemaining}
          </span>
        ) : (
          getGameTime(props.game.startTimeUTC)
        );
      }
      case GameState.PPD: {
        return "PPD";
      }
      case GameState.OFF:
      case GameState.FINAL: {
        return props.game.periodDescriptor?.periodType ?? "";
      }
      default: {
        return getGameTime(props.game.startTimeUTC);
      }
    }
  };

  const awayScore = props.game.awayTeam.score ?? 0;
  const homeScore = props.game.homeTeam.score ?? 0;

  const teamRow = (team: typeof props.game.awayTeam, won: boolean) => (
    <div className="flex items-center justify-between gap-2">
      <TeamLogo src={team.logo} alt="Team logo" width={24} height={24} />
      <span
        className={cn(
          "text-sm tabular-nums",
          won ? "font-semibold" : isFinal && "text-muted-foreground"
        )}
      >
        {team.score ?? 0}
      </span>
    </div>
  );

  return (
    <button
      type="button"
      className={cn(
        "bg-card hover:border-primary/50 flex min-w-[92px] shrink-0 cursor-pointer flex-col gap-1 rounded-lg border p-2 text-left shadow-xs transition-colors",
        isLive && "border-destructive/40"
      )}
      onClick={() =>
        router.push(`/game/${props.game.id}?${searchParams.toString()}`)
      }
    >
      <div className="text-muted-foreground text-center text-xs">
        {renderGameState(props.game.gameState)}
      </div>
      {teamRow(props.game.awayTeam, isFinal && awayScore > homeScore)}
      {teamRow(props.game.homeTeam, isFinal && homeScore > awayScore)}
    </button>
  );
}
