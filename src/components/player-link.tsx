"use client";
import React from "react";
import { Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useInjuredPlayers } from "@/context/injury-context";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

import { Ambulance } from "lucide-react";

interface Props {
  name: string | undefined;
  id: number | undefined;
  textStyle: string | null;
  onLinkClick?: (e: React.MouseEvent) => void;
  // Opens the player page in a new tab instead of navigating in place. Set
  // where the link sits inside a dialog: navigating there would tear the dialog
  // down and lose whatever the user was in the middle of — a draft, a lineup
  // being rearranged. Everywhere else the link stays in the same tab, so the
  // back button comes straight back to the list.
  openInNewTab?: boolean;
}

export default function PlayerLink(props: Props) {
  const searchParams = useSearchParams();

  const { injuredPlayers } = useInjuredPlayers();
  const playerId = props.id?.toString() ?? "";

  return props.name && props.id ? (
    <div className="flex min-w-0 items-center space-x-1">
      <Link
        onClick={(e) => props.onLinkClick?.(e)}
        href={`/player/${props.id}?${searchParams}`}
        target={props.openInNewTab ? "_blank" : undefined}
        rel={props.openInNewTab ? "noreferrer" : undefined}
        className="min-w-0"
      >
        <p
          className={`${props.textStyle ?? ""} truncate text-primary hover:underline`}
        >
          {props.name}
        </p>
      </Link>
      {injuredPlayers.hasOwnProperty(playerId) ? (
        <Popover>
          <PopoverTrigger
            nativeButton={false}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
            }}
            render={
              <Ambulance
                size={13}
                className="shrink-0 cursor-pointer text-red-500 transition-colors hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
              />
            }
          />
          <PopoverContent align="start">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="text-sm font-medium">
                    Estimate recovery:
                  </span>
                  <span className="col-span-2 text-sm">
                    {injuredPlayers[playerId].recovery}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="text-sm font-medium">Type:</span>
                  <span className="col-span-2 text-sm">
                    {injuredPlayers[playerId].type}
                  </span>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  ) : null;
}
