"use client";

/*
The survivor pool page.

Three tabs: the pick screen, the standings, and the owner's controls. Which
date is in view is the page's one piece of shared state — the pick screen acts
on it and the standings is read against it — so it lives here rather than in
either tab.

Which tab is open lives in the URL, as `activeTab`, the same way the roster
pool holds it. That is what makes the standings a link somebody can send, and
what keeps a reload on the page you were reading.
*/

import * as React from "react";
import { CalendarCheck, ListOrdered, Settings2, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageTitle from "@/components/page-title";
import FavoritePoolButton from "@/components/favorite-pool-button";
import SharePoolButton from "@/components/share-pool-button";
import ExportButton from "@/components/export-button";
import SurvivorParticipantLinkInvitation from "@/components/survivor-participant-link-invitation";
import { usePathname, useRouter } from "@/i18n/routing";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";
import {
  SurvivorPool,
  SurvivorStandings,
  SurvivorState,
} from "@/data/survivor/model";
import {
  canJoin,
  defaultWeek,
  hasSurvivorPrivilege,
  participantOf,
  spotsLeft,
  weekByNumber,
  weekOptions,
} from "@/lib/survivor";
import { buildSurvivorExport } from "@/lib/survivor-export";
import { fetchSurvivorStandings, joinSurvivorPool } from "@/lib/survivor-api";
import AdminTab from "./admin-tab";
import PickTab from "./pick-tab";
import StandingsTab from "./standings-tab";

interface Props {
  pool: SurvivorPool;
}

/*
Signing yourself up.

Self-serve on purpose: a pool meant for hundreds of people cannot have its
owner enter every name by hand the way the roster pool does.
*/
function JoinCard({
  pool,
  onJoined,
}: {
  pool: SurvivorPool;
  onJoined: (pool: SurvivorPool) => void;
}) {
  const t = useTranslations();
  const userSession = useSession();
  const [name, setName] = React.useState("");
  const [isJoining, setIsJoining] = React.useState(false);

  const join = async () => {
    setIsJoining(true);
    const res = await joinSurvivorPool(pool.name, name, userSession.info?.jwt);
    setIsJoining(false);

    if (!res.ok) {
      toast.error(res.error, { duration: 5000 });
      return;
    }
    onJoined(res.data);
    toast.success(t("SurvivorJoined", { pool: pool.name }));
  };

  return (
    <Alert className="text-left">
      <AlertTitle>{t("SurvivorJoinTitle")}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{t("SurvivorJoinDescription", { count: spotsLeft(pool) })}</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="survivor-join-name">{t("SurvivorYourName")}</Label>
            <Input
              id="survivor-join-name"
              value={name}
              maxLength={32}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("SurvivorYourName")}
            />
          </div>
          <Button
            disabled={isJoining || name.trim().length === 0}
            onClick={() => void join()}
          >
            {t("SurvivorJoin")}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/*
The tabs, as the URL names them.

A value the URL does not hold is one the page falls back to the pick screen
for, so a hand-edited or stale link lands somewhere rather than on a blank
panel. `admin` is in here whether or not the caller may see it: the tab itself
is only rendered for somebody who can administer the pool, so Base UI simply
finds no panel for the value and the page comes up on nothing — which is why
the fallback below checks the tab is one actually on screen.
*/
enum SurvivorTab {
  PICK = "pick",
  STANDINGS = "standings",
  ADMIN = "admin",
}

export default function SurvivorPoolPage(props: Props) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userData = useUser();
  const [pool, setPool] = React.useState<SurvivorPool>(props.pool);
  const [standings, setStandings] = React.useState<SurvivorStandings | null>(
    null,
  );
  const [selectedWeek, setSelectedWeek] = React.useState<number | null>(
    defaultWeek(props.pool)?.week ?? null,
  );

  const userId = userData.info?.id;
  const participant = participantOf(pool, userId);
  const canAdminister = hasSurvivorPrivilege(pool, userId);

  /*
  The open tab, read straight off the URL rather than mirrored into state:
  `useSearchParams` already re-renders on a back or forward navigation, so an
  entry that names no tab falls back to the pick screen instead of leaving the
  previous one showing.

  The settings tab is only a tab for somebody who can administer the pool, so a
  link to it opened by anybody else lands on the pick screen rather than on an
  empty panel. `canAdminister` turns true a moment after mount, once the user
  has resolved, and the URL is not rewritten in the meantime — the fallback is
  what is rendered, and the real tab appears when the answer arrives.
  */
  const requestedTab = searchParams.get("activeTab");
  const activeTab =
    requestedTab === SurvivorTab.STANDINGS ||
    (requestedTab === SurvivorTab.ADMIN && canAdminister)
      ? requestedTab
      : SurvivorTab.PICK;

  const openTab = (value: string) => {
    const queryParams = new URLSearchParams(searchParams.toString());
    queryParams.set("activeTab", value);
    /*
    `replace` and no scroll, the way the roster pool does it: a tab is a view
    of the same page, so it should neither jump back to the top nor cost a
    history entry the Back button has to walk through.

    The path comes from `usePathname` rather than being rebuilt from
    `pool.name`: the [name] segment reaches this page percent-encoded and
    `pool.name` is the decoded form, so a hand-built path would have to
    re-encode it and would get a pool named "my pool" wrong. next-intl's own
    hook is the one that answers without the locale prefix, which its router
    puts back.
    */
    router.replace(`${pathname}?${queryParams.toString()}`, { scroll: false });
  };

  const loadStandings = React.useCallback(async () => {
    const res = await fetchSurvivorStandings(pool.name);
    if (!res.ok) {
      toast.error(t("SurvivorCouldNotLoadStandings", { error: res.error }));
      return;
    }
    setStandings(res.data);
  }, [pool.name, t]);

  React.useEffect(() => {
    void loadStandings();
  }, [loadStandings]);

  // A pool change that came from a mutation (a settlement, a join) moves the
  // standings too, so they are refetched rather than left stale.
  const applyPool = (updated: SurvivorPool) => {
    setPool(updated);
    void loadStandings();
  };

  const week = selectedWeek === null ? null : weekByNumber(pool, selectedWeek);

  // One list for the dropdown's closed state and for its rows, so the two
  // cannot disagree.
  const weeks = React.useMemo(
    () => weekOptions(t, pool.weeks),
    [t, pool.weeks],
  );

  const statusBadge = (() => {
    if (pool.status === SurvivorState.Final) {
      return <Badge variant="secondary">{t("SurvivorPoolOver")}</Badge>;
    }
    if (pool.status === SurvivorState.Created) {
      return <Badge variant="outline">{t("SurvivorPoolOpenToJoin")}</Badge>;
    }
    return <Badge>{t("PoolInProgressState")}</Badge>;
  })();

  const winnerNames = (pool.winners ?? [])
    .map((id) => pool.participants.find((person) => person.id === id)?.name)
    .filter((name): name is string => name !== undefined);

  return (
    <div className="mx-auto max-w-6xl px-4">
      <PageTitle
        title={pool.name}
        subtitle={t("SurvivorSubtitle", {
          participants: pool.participants.length,
          max: pool.settings.max_participants,
        })}
        titleAdornment={
          <>
            {statusBadge}
            <FavoritePoolButton
              poolName={pool.name}
              kind="survivor"
              season={pool.season}
              className="-my-1"
            />
            <SharePoolButton poolName={pool.name} className="-my-1" />
            {/*
            The standings are what carry the picks, so the export is only
            worth offering once they are in — before that it would hand
            somebody a schedule and call it the pool.
            */}
            {standings === null ? null : (
              <ExportButton
                build={() => buildSurvivorExport({ pool, standings, t })}
                baseName={pool.name}
                className="-my-1"
              />
            )}
          </>
        }
      />

      {winnerNames.length > 0 ? (
        <Alert className="mb-4 text-left">
          <Trophy className="size-4" />
          <AlertTitle>
            {winnerNames.length === 1
              ? t("SurvivorWinner", { name: winnerNames[0] })
              : t("SurvivorSharedWinners", { names: winnerNames.join(", ") })}
          </AlertTitle>
        </Alert>
      ) : null}

      <SurvivorParticipantLinkInvitation pool={pool} onPoolChange={setPool} />

      {canJoin(pool, userId) ? (
        <div className="mb-4">
          <JoinCard pool={pool} onJoined={applyPool} />
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={openTab}>
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value={SurvivorTab.PICK}>
              <CalendarCheck className="size-4" />
              {t("SurvivorPickTab")}
            </TabsTrigger>
            <TabsTrigger value={SurvivorTab.STANDINGS}>
              <ListOrdered className="size-4" />
              {t("SurvivorStandingsTab")}
            </TabsTrigger>
            {canAdminister ? (
              <TabsTrigger value={SurvivorTab.ADMIN}>
                <Settings2 className="size-4" />
                {t("Settings")}
              </TabsTrigger>
            ) : null}
          </TabsList>

          {/*
          `items` is what makes the closed trigger read "Week 3 — 2026-10-17"
          rather than the bare value it holds, which is "3".
          */}
          <Select
            value={selectedWeek === null ? "" : String(selectedWeek)}
            items={weeks}
            onValueChange={(value) => setSelectedWeek(Number(value))}
          >
            <SelectTrigger className="ml-auto w-64">
              <SelectValue placeholder={t("SurvivorSelectWeek")} />
            </SelectTrigger>
            <SelectContent>
              {weeks.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={SurvivorTab.PICK} className="pt-4">
          {week === null ? (
            <p className="text-muted-foreground text-sm">
              {t("SurvivorNoWeeks")}
            </p>
          ) : (
            <PickTab pool={pool} week={week} participant={participant} />
          )}
        </TabsContent>

        <TabsContent value={SurvivorTab.STANDINGS} className="pt-4">
          {standings === null ? (
            <TableSkeleton />
          ) : (
            <StandingsTab
              pool={pool}
              standings={standings}
              selectedWeek={selectedWeek}
            />
          )}
        </TabsContent>

        {canAdminister ? (
          <TabsContent value={SurvivorTab.ADMIN} className="pt-4">
            <AdminTab pool={pool} onPoolChange={applyPool} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
