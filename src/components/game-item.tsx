"use client";
import React from "react";

import { Game, GameState } from "@/data/nhl/game";
import { useRouter } from "@/navigation";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
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

  const renderGameState = (status: GameState) => {
    /*
    Render the game status.
    */

    switch (status) {
      case GameState.LIVE:
      case GameState.CRIT: {
        return props.game && props.game.period && props.game.clock ? (
          <p className="text-red-500">
            P{props.game.period} - {props.game.clock.timeRemaining}
          </p>
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

  return (
    <div
      className="shrink-0 min-w-[80px] h-[80px] p-2 border-2 rounded-sm hover:border-primary hover:cursor-pointer bg-muted text-sm"
      onClick={() =>
        router.push(`/game/${props.game.id}?${searchParams.toString()}`)
      }
    >
      <table width="100%">
        <tbody>
          <tr>
            <td colSpan={2} align="center">
              <p className="text-sm">{renderGameState(props.game.gameState)}</p>
            </td>
          </tr>
          <tr>
            <td>
              <Image
                src={props.game.awayTeam.logo}
                alt="Away team logo"
                width={25}
                height={25}
              />
            </td>
            <td>{props.game.awayTeam.score ?? 0}</td>
          </tr>
          <tr>
            <td>
              <Image
                src={props.game.homeTeam.logo}
                alt="Home team logo"
                width={25}
                height={25}
              />
            </td>
            <td>{props.game.homeTeam.score ?? 0}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
