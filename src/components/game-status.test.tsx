import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GameStatus, Matchup, opponentOf } from "./game-status";
import { Game, GameState } from "@/data/nhl/game";

/*
The one place the app says where a game stands.

Both the strip of games above the pool and the pooler's own roster tables are
drawn from this, so a night that reads "19:00" in one and "P2" in the other is
the failure these pin down. Team 8 is Montréal and 10 Toronto, which is only
to say the logos resolve.
*/

const game = (overrides: Partial<Game> = {}): Game =>
  ({
    id: 1,
    startTimeUTC: "2026-10-19T23:00:00Z",
    gameState: GameState.FUT,
    awayTeam: { id: 8, logo: "away.svg" },
    homeTeam: { id: 10, logo: "home.svg" },
    ...overrides,
  }) as Game;

describe("a game's status", () => {
  it("shows a clock for a game that has not started", () => {
    const { container } = render(<GameStatus game={game()} />);

    // Asserted as a shape rather than a string: the component formats in the
    // reader's own zone, so a fixed "19:00" would only hold on one runner.
    expect(container.textContent).toMatch(/\d{1,2}:\d{2}/);
  });

  it("shows the period and the clock while the game is on", () => {
    render(
      <GameStatus
        game={game({
          gameState: GameState.LIVE,
          period: 2,
          clock: {
            timeRemaining: "12:34",
            running: true,
            inIntermission: false,
          },
        })}
      />,
    );

    expect(screen.getByText("P2 - 12:34")).toBeInTheDocument();
  });

  it("falls back to the start time while a live game has no clock yet", () => {
    // The feed flips the state before it publishes the period and the clock.
    const { container } = render(
      <GameStatus game={game({ gameState: GameState.LIVE })} />,
    );

    expect(container.textContent).toMatch(/\d{1,2}:\d{2}/);
    expect(screen.queryByText(/^P/)).not.toBeInTheDocument();
  });

  it("says how a finished game ended", () => {
    render(
      <GameStatus
        game={game({
          gameState: GameState.OFF,
          periodDescriptor: { number: 4, periodType: "OT" },
        })}
      />,
    );

    expect(screen.getByText("OT")).toBeInTheDocument();
  });

  it("marks a postponed game", () => {
    render(<GameStatus game={game({ gameState: GameState.PPD })} />);

    expect(screen.getByText("PPD")).toBeInTheDocument();
  });

  it("renders nothing for a player with no game", () => {
    const { container } = render(<GameStatus game={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("a matchup", () => {
  it("reads as a home game for the home side", () => {
    render(<Matchup game={game()} teamId={10} />);

    expect(screen.getByText("vs")).toBeInTheDocument();
  });

  it("reads as a road game for the visitors", () => {
    render(<Matchup game={game()} teamId={8} />);

    expect(screen.getByText("@")).toBeInTheDocument();
  });

  it("says so when the player's team is not on the schedule", () => {
    render(<Matchup game={null} teamId={8} />);

    expect(screen.getByText("PlayerNoGame")).toBeInTheDocument();
  });

  it("names the other team, whichever side the player is on", () => {
    expect(opponentOf(game(), 10)).toBe(8);
    expect(opponentOf(game(), 8)).toBe(10);
    expect(opponentOf(null, 8)).toBeNull();
    expect(opponentOf(game(), null)).toBeNull();
  });
});
