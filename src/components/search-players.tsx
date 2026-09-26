"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoaderCircle, Search, X } from "lucide-react";
import { Player } from "@/data/pool/model";
import { searchPlayers } from "@/lib/client-data";
import PlayerLink from "./player-link";
import { TeamLogo } from "./team-logo";
import { useTranslations } from "next-intl";
import PlayerSalary from "./player-salary";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const MINIMUM_SEARCH_CHARACTER = 3;
const SEARCH_DEBOUNCE_MS = 300;

interface PlayerSearchDialogProps {
  label: string;
  onPlayerSelect: ((player: Player) => Promise<boolean>) | null;
  variant?: React.ComponentProps<typeof Button>["variant"];
  // Season being played, in the 20252026 format, so a result's cap hit can show
  // the term still to run on the contract.
  currentSeason?: number;
  size?: React.ComponentProps<typeof Button>["size"];

  // Controlled mode: the caller owns the open state and no trigger button is
  // rendered. Used where the dialog is opened by something other than a button
  // of its own — picking the replacement of a player being dropped, say.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  // Why a result cannot be picked, when it cannot. A row with a reason is
  // shown greyed out with it rather than left clickable to fail on submit.
  unavailableReason?: (player: Player) => string | null;
}

export default function PlayerSearchDialog(props: PlayerSearchDialogProps) {
  const [searchInput, setSearchInput] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isUncontrolledOpen, setIsUncontrolledOpen] = React.useState(false);
  const t = useTranslations();

  const isControlled = props.open !== undefined;
  const isOpen = isControlled ? props.open! : isUncontrolledOpen;
  const setIsOpen = (open: boolean) => {
    if (!isControlled) {
      setIsUncontrolledOpen(open);
    }
    props.onOpenChange?.(open);
  };

  // Debounced so typing a name does not fire a request per keystroke.
  React.useEffect(() => {
    const trimmed = searchInput.trim();
    const timeout = setTimeout(
      () => setSearchTerm(trimmed),
      trimmed.length >= MINIMUM_SEARCH_CHARACTER ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const isSearchActive = searchTerm.length >= MINIMUM_SEARCH_CHARACTER;

  const query = useQuery({
    queryKey: ["players-search", searchTerm],
    queryFn: () => searchPlayers(searchTerm),
    enabled: isSearchActive,
  });

  const onPlayerSelect = async (player: Player) => {
    // onPlayerSelect resolves to false when the player could not be added
    // (already owned, roster full, ...), in which case the dialog has to stay
    // open so the user can pick someone else.
    if (await props.onPlayerSelect?.(player)) setIsOpen(false);
  };

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchInput("");
      setSearchTerm("");
    }
  };

  const results = query.data ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {isControlled ? null : (
        <DialogTrigger
          render={
            <Button
              variant={props.variant}
              size={props.size}
              className="flex items-center gap-2"
            />
          }
        >
          <Search className="size-4" />
          {props.label}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{props.label}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="relative">
            {isSearchActive && query.isFetching ? (
              <LoaderCircle className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : (
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              autoFocus
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && searchInput) {
                  e.stopPropagation(); // Clear the search rather than close the dialog.
                  setSearchInput("");
                }
              }}
              placeholder={t("SearchAPlayer")}
              aria-label={t("PlayerSearch")}
              className="px-8 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchInput ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("ClearSearch")}
                onClick={() => setSearchInput("")}
                className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="min-h-[120px] max-h-[320px] overflow-y-auto">
            {!isSearchActive ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {t("SearchMinimumCharacters", {
                  count: MINIMUM_SEARCH_CHARACTER,
                })}
              </p>
            ) : query.isPending ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {t("Searching")}
              </p>
            ) : results.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {t("NoPlayersFoundWith", { searchValue: searchTerm })}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {results.map((player) => {
                  const unavailableReason =
                    props.unavailableReason?.(player) ?? null;
                  return (
                    <li key={player.id}>
                      {/* A div rather than a button: the row embeds a link to
                        the player page, which cannot live inside a button. */}
                      <div
                        role="button"
                        tabIndex={unavailableReason ? -1 : 0}
                        aria-disabled={unavailableReason !== null}
                        onClick={() =>
                          unavailableReason ? undefined : onPlayerSelect(player)
                        }
                        onKeyDown={(e) => {
                          if (unavailableReason) {
                            return;
                          }
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onPlayerSelect(player);
                          }
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          unavailableReason
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        <TeamLogo teamId={player.team} width={26} height={26} />
                        <PlayerLink
                          id={player.id}
                          name={player.name}
                          textStyle={null}
                          // The search runs in a dialog, which navigating in
                          // place would tear down.
                          openInNewTab
                          onLinkClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {player.position}
                        </span>
                        {unavailableReason ? (
                          <span className="text-xs text-muted-foreground">
                            · {unavailableReason}
                          </span>
                        ) : null}
                        <span className="ml-auto">
                          {player.salary_cap ||
                          player.contract_expiration_season ? (
                            <PlayerSalary
                              playerName={player.name}
                              team={player.team}
                              salary={player.salary_cap}
                              contractExpirationSeason={
                                player.contract_expiration_season
                              }
                              currentSeason={props.currentSeason}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                              }}
                            />
                          ) : null}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
