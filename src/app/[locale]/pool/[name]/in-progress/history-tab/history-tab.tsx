import * as React from "react";
import { Trade } from "@/data/pool/model";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShieldPlus,
  BadgeMinus,
  CalendarDays,
  ArrowLeftRight,
  History as HistoryIcon,
} from "lucide-react";
import PlayerLink from "@/components/player-link";
import { YouBadge } from "@/components/pooler-name";
import { usePoolContext } from "@/context/pool-context";
import { useFormatter, useTranslations } from "next-intl";
import { TradeItem } from "@/components/trade";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface DailyMovements {
  // Daily movements for a specific date and pooler
  participant: string;
  addedPlayerIds: string[];
  removedPlayerIds: string[];
}

interface DailyHistory {
  // The full daily history. Contains all movements and trades for a specific date.
  date: string;
  dailyMovements: DailyMovements[];
  dailyTrades: Trade[];
}

export default function HistoryTab() {
  const { poolInfo, lastFormatDate, userPoolUser } = usePoolContext();
  const t = useTranslations();
  const format = useFormatter();
  const [history, setHistory] = React.useState<DailyHistory[] | null>(null);

  const formatDate = (date: string) =>
    date === "Today"
      ? t("Today")
      : format.dateTime(new Date(date + "T00:00:00"), {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });

  const getDailyMovement = (
    participant: string,
    oldRoster: string[],
    newRoster: string[],
  ): DailyMovements | null => {
    // Return the roster movement for a specific date comparing between the roster of 2 dates.
    const added = newRoster.filter((value) => !oldRoster.includes(value));
    const removed = oldRoster.filter((value) => !newRoster.includes(value));

    if (added.length === 0 && removed.length === 0) {
      return null;
    }

    return { participant, addedPlayerIds: added, removedPlayerIds: removed };
  };

  const getDailyRoster = (participant: string, jDate: string): string[] => {
    // Get the daily roster of a participant for a specific date.
    if (!poolInfo.context?.score_by_day?.[jDate]) {
      return [];
    }

    const forwards = Object.keys(
      poolInfo.context.score_by_day[jDate][participant].roster.F,
    );
    const defenders = Object.keys(
      poolInfo.context.score_by_day[jDate][participant].roster.D,
    );
    const goalies = Object.keys(
      poolInfo.context.score_by_day[jDate][participant].roster.G,
    );
    return forwards.concat(defenders, goalies);
  };

  const getLatestRoster = (participant: string): string[] => {
    // Get the current roster of a participant.
    if (!poolInfo.context?.pooler_roster[participant]) {
      return [];
    }
    const forwards = poolInfo.context.pooler_roster[
      participant
    ].chosen_forwards.map((playerId) => playerId.toString());
    const defenders = poolInfo.context.pooler_roster[
      participant
    ].chosen_defenders.map((playerId) => playerId.toString());
    const goalies = poolInfo.context.pooler_roster[
      participant
    ].chosen_goalies.map((playerId) => playerId.toString());

    return forwards.concat(defenders, goalies);
  };

  const GetAllHistory = async () => {
    // Parse all history of the pool.
    if (poolInfo.context === null || poolInfo.participants === null) {
      return null;
    }

    const startDate = new Date(poolInfo.season_start + "T00:00:00");
    const endDate = lastFormatDate
      ? new Date(lastFormatDate + "T00:00:00")
      : new Date();

    const currentRoster: Map<string, string[]> = new Map();
    const historyTmp: DailyHistory[] = [];

    for (let j = startDate; j <= endDate; j.setDate(j.getDate() + 1)) {
      const jDate = j.toISOString().slice(0, 10);

      const dailyMovements = []; // Will capture all movement that happened on this date.
      const dailyTrades =
        poolInfo.trades?.filter(
          (trade) =>
            trade.status === "ACCEPTED" &&
            new Date(trade.date_accepted + 3600000)
              .toISOString()
              .slice(0, 10) === jDate,
        ) ?? [];

      if (
        poolInfo.context.score_by_day &&
        poolInfo.context.score_by_day[jDate] &&
        poolInfo.participants
      ) {
        for (let i = 0; i < poolInfo.participants.length; i += 1) {
          const user = poolInfo.participants[i];
          const newRoster = getDailyRoster(user.id, jDate);

          const oldRoster = currentRoster.get(user.id);

          if (oldRoster) {
            // see if a changes was made to the roster and note it in historyTmp.
            const movements = getDailyMovement(user.name, oldRoster, newRoster);
            if (movements !== null) {
              dailyMovements.push(movements);
            }
          }

          // update the current roster.
          currentRoster.set(user.id, newRoster);
        }

        if (dailyMovements.length > 0 || dailyTrades.length > 0) {
          historyTmp.unshift({ date: jDate, dailyMovements, dailyTrades });
        }
      }
    }

    // Make sure that we count current roster (for days that roster modifications are allowed we will see them in real time)
    // TODO: this could be generalize by creating a function centralizing logic between this and the for loop above.
    const dailyMovements = []; // Will capture all movement that happened on this date.
    for (let i = 0; i < poolInfo.participants.length; i += 1) {
      const user = poolInfo.participants[i];

      const latestRoster = getLatestRoster(user.id);
      const oldRoster = currentRoster.get(user.id);

      if (oldRoster) {
        // see if a changes was made to the roster and note it in historyTmp.
        const movements = getDailyMovement(user.name, oldRoster, latestRoster);
        if (movements !== null) {
          dailyMovements.push(movements);
        }
      }
    }

    if (dailyMovements.length > 0) {
      historyTmp.unshift({ date: "Today", dailyMovements, dailyTrades: [] });
    }

    setHistory(historyTmp);
  };

  React.useEffect(() => {
    GetAllHistory();
  }, []);

  if (history === null) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="mb-4 h-5 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <HistoryIcon className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">{t("NoRosterChanges")}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("NoRosterChangesDescription")}
        </p>
      </div>
    );
  }

  const PlayerRow = (playerId: string) => (
    <PlayerLink
      key={playerId}
      name={`${poolInfo.context?.players[playerId].name} (${t(
        poolInfo.context?.players[playerId].position ?? "",
      )})`}
      id={Number(playerId)}
      textStyle="text-sm"
    />
  );

  const Movements = (movements: DailyMovements) => (
    <div
      key={movements.participant}
      className="rounded-lg border bg-muted/30 p-3"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
          {movements.participant.slice(0, 2)}
        </span>
        <span className="font-semibold">{movements.participant}</span>
        {movements.participant === userPoolUser?.name ? <YouBadge /> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            <ShieldPlus size={14} />
            {t("Added")}
          </div>
          {movements.addedPlayerIds.length > 0 ? (
            movements.addedPlayerIds.map(PlayerRow)
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-rose-600 dark:text-rose-400">
            <BadgeMinus size={14} />
            {t("Removed")}
          </div>
          {movements.removedPlayerIds.length > 0 ? (
            movements.removedPlayerIds.map(PlayerRow)
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {history.map((dailyHistory) => {
        const changeCount =
          dailyHistory.dailyMovements.length + dailyHistory.dailyTrades.length;
        return (
          <Card key={dailyHistory.date} className="overflow-hidden">
            <Accordion defaultValue={[dailyHistory.date]}>
              <AccordionItem value={dailyHistory.date} className="border-b-0">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">
                      {formatDate(dailyHistory.date)}
                    </span>
                    <Badge variant="secondary" className="font-normal">
                      {changeCount}
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4">
                  <div className="flex flex-col gap-3">
                    {dailyHistory.dailyMovements.map((movements) =>
                      Movements(movements),
                    )}
                    {dailyHistory.dailyTrades.length > 0 &&
                      dailyHistory.dailyMovements.length > 0 && <Separator />}
                    {dailyHistory.dailyTrades.map((trade) => (
                      <div key={trade.id} className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <ArrowLeftRight size={14} />
                          {t("Trade")}
                        </div>
                        <TradeItem trade={trade} poolInfo={poolInfo} />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        );
      })}
    </div>
  );
}
