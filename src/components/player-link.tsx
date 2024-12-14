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
    <div className="flex space-x-1">
      <Link
        onClick={(e) => props.onLinkClick?.(e)}
        href={`/player/${props.id}?${searchParams}`}
        target="_blank"
      >
        <p className={`${props.textStyle ?? ""} text-link hover:underline`}>
          {props.name}
        </p>
      </Link>
      {injuredPlayers.hasOwnProperty(playerId) ? (
        <Popover>
          <PopoverTrigger
            asChild
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
            }}
          >
            <Ambulance size={18} color="red" className="cursor-pointer" />
          </PopoverTrigger>
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
