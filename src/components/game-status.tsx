"use client";

import { Game, GameState } from "@/data/nhl/game";
import { TeamLogo } from "@/components/team-logo";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

/*
A game's clock, in the one line it deserves, and the matchup it belongs to.

Both read the same `Game` the daily feed is drawn from, so the strip of games
at the top of the page and the pooler's own roster tables below it can never
disagree about when a game starts or how it ended.
*/

/*
The puck drop in the reader's own time zone. Every caller renders on the
client (the night's games come from a query), so reading the browser's zone
here cannot disagree with server markup.
*/
export function GameTime({ startTimeUTC }: { startTimeUTC: string | null }) {
  const locale = useLocale();

  if (startTimeUTC === null) {
    return null;
  }

  return (
    <span className="tabular-nums whitespace-nowrap">
      {new Date(Date.parse(startTimeUTC)).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

/*
Where a game stands: the puck drop before it starts, the period and the clock
while it is on, and how it ended once it is over.
*/
export function GameStatus({
  game,
  className,
}: {
  game: Game | null;
  className?: string;
}) {
  if (game === null) {
    return null;
  }

  switch (game.gameState) {
    case GameState.LIVE:
    case GameState.CRIT: {
      // The feed publishes the period and the clock a moment after the state
      // flips to live, so the start time stands in until they arrive.
      return game.period && game.clock ? (
        <span
          className={cn(
            "text-destructive inline-flex items-center justify-center gap-1 font-medium whitespace-nowrap",
            className,
          )}
        >
          <span className="bg-destructive inline-flex size-1.5 animate-pulse rounded-full" />
          P{game.period} - {game.clock.timeRemaining}
        </span>
      ) : (
        <GameTime startTimeUTC={game.startTimeUTC} />
      );
    }
    case GameState.PPD: {
      return <span className={className}>PPD</span>;
    }
    case GameState.OFF:
    case GameState.FINAL: {
      return (
        <span className={className}>
          {game.periodDescriptor?.periodType ?? ""}
        </span>
      );
    }
    default: {
      return <GameTime startTimeUTC={game.startTimeUTC} />;
    }
  }
}

/*
Who a player's team is up against, and whether they are at home. Says so in
as many characters as the table can spare: `vs` or `@`, then the crest.
*/
export function Matchup({
  game,
  teamId,
}: {
  game: Game | null;
  teamId: number | null;
}) {
  const t = useTranslations();

  if (game === null || teamId === null) {
    return (
      <span className="text-muted-foreground text-xs">{t("PlayerNoGame")}</span>
    );
  }

  const isHome = game.homeTeam.id === teamId;

  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-muted-foreground w-4 shrink-0 text-xs">
        {isHome ? "vs" : "@"}
      </span>
      <TeamLogo
        teamId={isHome ? game.awayTeam.id : game.homeTeam.id}
        width={22}
        height={22}
      />
    </span>
  );
}

// The team the player's own team meets, or null when they have no game.
export const opponentOf = (game: Game | null, teamId: number | null) =>
  game === null || teamId === null
    ? null
    : game.homeTeam.id === teamId
      ? game.awayTeam.id
      : game.homeTeam.id;
