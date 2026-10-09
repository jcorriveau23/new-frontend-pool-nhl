"use client";

/*
The survivor pool page.

Three tabs: the pick screen, the standings, and the owner's controls. Which
date is in view is the page's one piece of shared state — the pick screen acts
on it and the standings is read against it — so it lives here rather than in
either tab.
*/

import * as React from "react";
import { CalendarCheck, ListOrdered, Settings2, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
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
import SharePoolButton from "@/components/share-pool-button";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";
import {
  SurvivorPool,
  SurvivorStandings,
  SurvivorState,
  WeekStatus,
} from "@/data/survivor/model";
import {
  canJoin,
  defaultWeek,
  hasSurvivorPrivilege,
  participantOf,
  spotsLeft,
  weekByNumber,
} from "@/lib/survivor";
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

export default function SurvivorPoolPage(props: Props) {
  const t = useTranslations();
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
            <SharePoolButton poolName={pool.name} className="-my-1" />
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

      {canJoin(pool, userId) ? (
        <div className="mb-4">
          <JoinCard pool={pool} onJoined={applyPool} />
        </div>
      ) : null}

      <Tabs defaultValue="pick">
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="pick">
              <CalendarCheck className="size-4" />
              {t("SurvivorPickTab")}
            </TabsTrigger>
            <TabsTrigger value="standings">
              <ListOrdered className="size-4" />
              {t("SurvivorStandingsTab")}
            </TabsTrigger>
            {canAdminister ? (
              <TabsTrigger value="admin">
                <Settings2 className="size-4" />
                {t("Settings")}
              </TabsTrigger>
            ) : null}
          </TabsList>

          <Select
            value={selectedWeek === null ? "" : String(selectedWeek)}
            onValueChange={(value) => setSelectedWeek(Number(value))}
          >
            <SelectTrigger className="ml-auto w-56">
              <SelectValue placeholder={t("SurvivorSelectWeek")} />
            </SelectTrigger>
            <SelectContent>
              {pool.weeks.map((candidate) => (
                <SelectItem key={candidate.week} value={String(candidate.week)}>
                  {t("SurvivorWeekLabel", { week: candidate.week })} —{" "}
                  {candidate.pick_date}
                  {candidate.status === WeekStatus.Settled ? " ✓" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="pick" className="pt-4">
          {week === null ? (
            <p className="text-muted-foreground text-sm">
              {t("SurvivorNoWeeks")}
            </p>
          ) : (
            <PickTab pool={pool} week={week} participant={participant} />
          )}
        </TabsContent>

        <TabsContent value="standings" className="pt-4">
          {standings === null ? (
            <TableSkeleton />
          ) : (
            <StandingsTab pool={pool} standings={standings} />
          )}
        </TabsContent>

        {canAdminister ? (
          <TabsContent value="admin" className="pt-4">
            <AdminTab pool={pool} onPoolChange={applyPool} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
