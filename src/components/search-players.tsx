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
import { Search } from "lucide-react";
import { Player } from "@/data/pool/model";
import PlayerLink from "./player-link";
import { TeamLogo } from "./team-logo";
import { useTranslations } from "next-intl";

const MINIMUM_SEARCH_CHARACTER = 3;

interface Props {
  onPlayerSelect: ((player: Player) => boolean) | null;
}

export default function PlayerSearchDialog(props: Props) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Player[] | null>(
    null
  );
  const [isSearching, setIsSearching] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const t = useTranslations();

  const fetchPlayers = async (name: string): Promise<Player[] | null> => {
    const res = await fetch(`/api-rust/get-players/${name}`);
    if (!res.ok) {
      return null;
    }
    return await res.json();
  };

  const handleSearch = async () => {
    setIsSearching(true);
    if (searchQuery.length >= MINIMUM_SEARCH_CHARACTER) {
      const players = await fetchPlayers(searchQuery);
      setSearchResults(players);
    }
    setIsSearching(false);
  };

  const onPlayerSelect = (player: Player) => {
    if (props.onPlayerSelect?.(player)) setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Search className="w-4 h-4" />
          {t("PlayerSearch")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("PlayerSearch")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder={`${t("PlayerName")}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow"
            />
            <Button
              onClick={handleSearch}
              disabled={
                searchQuery.length < MINIMUM_SEARCH_CHARACTER || isSearching
              }
            >
              {isSearching ? t("Searching") : t("Search")}
            </Button>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <ul className="space-y-2">
              {searchResults?.map((player) => (
                <li
                  key={player.id}
                  className="border p-2 rounded"
                  onClick={() => onPlayerSelect(player)}
                >
                  <div className="flex items-center space-x-2">
                    <PlayerLink
                      id={player.id}
                      name={player.name}
                      textStyle={null}
                    />
                    <TeamLogo teamId={player.team} width={30} height={30} />
                    {` ( ${player.position} )`}
                  </div>
                </li>
              ))}
            </ul>
            {searchResults?.length === 0 && (
              <p className="text-center text-gray-500 mt-4">
                {t(`NoPlayersFoundWith`, { searchValue: searchQuery })}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
