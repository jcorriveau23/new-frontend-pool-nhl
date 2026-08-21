"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { TeamLogo } from "@/components/team-logo";
import { useTranslations } from "next-intl";

export interface Team {
  id: number;
  name: string;
}

interface Props {
  teams: Team[];
  season: string;
  queryString: string;
  // Rendered next to the search field so the whole toolbar sits on one row.
  seasonSelector: React.ReactNode;
}

export default function TeamList({
  teams,
  season,
  queryString,
  seasonSelector,
}: Props) {
  const t = useTranslations();
  const [search, setSearch] = React.useState("");

  const filteredTeams = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = query
      ? teams.filter((team) => team.name.toLowerCase().includes(query))
      : teams;

    // Sorted by name, `team_info` is keyed by franchise id and its order has no
    // meaning for the reader.
    return [...matching].sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, search]);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("SearchTeams")}
            className="pl-9"
          />
        </div>
        {seasonSelector}
      </div>

      {filteredTeams.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTeams.map((team) => (
            <Link
              key={team.id}
              href={`/roster/${season}/${team.id}?${queryString}`}
              className="focus-visible:ring-ring rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <Card className="hover:border-primary hover:bg-muted/50 flex h-full items-center gap-3 p-4 text-left transition-colors">
                <TeamLogo teamId={team.id} width={40} height={40} />
                <p className="min-w-0 flex-1 font-medium leading-tight">
                  {team.name}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("NoTeamMatchSearch")}
        </p>
      )}
    </div>
  );
}
