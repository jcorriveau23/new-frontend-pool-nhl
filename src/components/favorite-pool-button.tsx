"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PoolKind, useFavoritePools } from "@/hooks/use-favorite-pools";
import { cn } from "@/lib/utils";

interface Props {
  poolName: string;
  // Which game the pool is, since a survivor pool and a roster pool may share a
  // name and are on different pages.
  kind: PoolKind;
  season?: number;
  className?: string;
}

// Toggles a pool in the favorites, which pin it at the top of the pool list and
// give it a shortcut in the sidebar.
export default function FavoritePoolButton({
  poolName,
  kind,
  season,
  className,
}: Props) {
  const t = useTranslations();
  const { isFavorite, toggleFavorite, recordSeason } = useFavoritePools();

  const favorite = isFavorite(kind, poolName);

  // Favorites saved before the season was stored, or from a page that did not
  // know it, get it filled in the first time such a page renders them.
  React.useEffect(() => {
    if (season !== undefined) {
      recordSeason(kind, poolName, season);
    }
  }, [kind, poolName, season, recordSeason]);

  // Doubles as the accessible name, the star alone says nothing.
  const label = t(favorite ? "RemoveFromFavorites" : "AddToFavorites", {
    pool: poolName,
  });

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-8 shrink-0", className)}
            aria-pressed={favorite}
            aria-label={label}
            onClick={() => toggleFavorite(kind, poolName, season)}
          />
        }
      >
        <Star
          className={
            favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
          }
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
