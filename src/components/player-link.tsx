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
}

export default function PlayerLink(props: Props) {
  const searchParams = useSearchParams();

  const { injuredPlayers } = useInjuredPlayers();
  const playerId = props.id?.toString() ?? "";

  return props.name && props.id ? (
    <div className="flex items-center space-x-1.5">
      <Link
        onClick={(e) => props.onLinkClick?.(e)}
        href={`/player/${props.id}?${searchParams}`}
        target="_blank"
      >
        <p className={`${props.textStyle ?? ""} text-primary hover:underline`}>
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
                size={16}
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
