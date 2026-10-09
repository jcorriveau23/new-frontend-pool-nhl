import * as React from "react";
import { RosterTransaction } from "@/data/pool/model";
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
  CalendarClock,
  ArrowLeftRight,
  History as HistoryIcon,
  LoaderCircle,
  Repeat,
  Trash2,
  ArrowRight,
} from "lucide-react";
import PlayerLink from "@/components/player-link";
import { PoolerNameText } from "@/components/pooler-name";
import { usePoolContext } from "@/context/pool-context";
import { useFormatter, useTranslations } from "next-intl";
import { TradeItem } from "@/components/trade";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DailyHistory,
  DailyMovements,
  LineupEventChange,
  TODAY,
  addLineupEventsToHistory,
  addWaiversToHistory,
} from "./history-calculation";
import { format as formatDateFns } from "date-fns";
import { eventKey, useLineupEvents } from "@/hooks/use-lineup-events";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function HistoryTab() {
  const { poolInfo, lastFormatDate, userPoolUser, dictUsers } =
    usePoolContext();
  const t = useTranslations();
  const format = useFormatter();
  const [history, setHistory] = React.useState<DailyHistory[] | null>(null);
  const lineupEvents = useLineupEvents();
  const [eventToDrop, setEventToDrop] =
    React.useState<LineupEventChange | null>(null);

  // The endpoints take a local day, not an instant, so a picked date is keyed
  // the same way the pool spells its own dates.
  const formatDateKey = (date: Date) => formatDateFns(date, "yyyy-MM-dd");

  const formatDate = (date: string) =>
    date === TODAY
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
      // Every stored trade has happened, and it counts from the day the
      // poolers agreed on it — which is already the day the history is keyed
      // by, so no timestamp conversion is needed anymore.
      const dailyTrades =
        poolInfo.trades?.filter((trade) => trade.effective_date === jDate) ??
        [];

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
          historyTmp.unshift({
            date: jDate,
            dailyMovements,
            dailyTrades,
            dailyWaivers: [],
            dailyLineupEvents: [],
          });
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
      historyTmp.unshift({
        date: TODAY,
        dailyMovements,
        dailyTrades: [],
        dailyWaivers: [],
        dailyLineupEvents: [],
      });
    }

    const participantName = (participantId: string) =>
      dictUsers[participantId]?.name ?? participantId;

    // Waiver claims are listed as swaps rather than as a player that came
    // and one that went. The lineup changes the pool has on record go in last,
    // since each one supersedes the movements derived for its day.
    setHistory(
      addLineupEventsToHistory(
        addWaiversToHistory(
          historyTmp,
          poolInfo.context.roster_transactions ?? [],
          participantName,
        ),
        poolInfo.context.lineup_events ?? [],
        participantName,
      ),
    );
  };

  // Rebuilt whenever the pool is written to, which is what re-dating or
  // dropping an event does: `date_updated` is the version stamp every mutation
  // bumps, so the list cannot go on showing the history that was just edited.
  React.useEffect(() => {
    GetAllHistory();
  }, [poolInfo.date_updated]);

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

  const PlayerRow = (playerId: string) => {
    // A player picked up off waivers may be missing from the pool's players
    // until the pool is refetched; the id still links to him.
    const player = poolInfo.context?.players[playerId];
    return (
      <PlayerLink
        key={playerId}
        name={
          player ? `${player.name} (${t(player.position)})` : `#${playerId}`
        }
        id={Number(playerId)}
        textStyle="text-sm"
      />
    );
  };

  const WaiverClaimRow = (waiver: RosterTransaction) => {
    const name = dictUsers[waiver.participant]?.name ?? waiver.participant;
    return (
      <div
        key={`${waiver.participant}-${waiver.date_created}-${waiver.dropped_player_id}`}
        className="rounded-lg border bg-muted/30 p-3"
      >
        <PoolerNameText
          name={name}
          isYou={waiver.participant === userPoolUser?.id}
          className="mb-2 font-semibold"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-rose-600 dark:text-rose-400">
              <BadgeMinus size={14} />
              {t("PlacedOnWaivers")}
            </div>
            {PlayerRow(waiver.dropped_player_id.toString())}
          </div>
          <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              <ShieldPlus size={14} />
              {t("PickedUp")}
            </div>
            {PlayerRow(waiver.added_player_id.toString())}
          </div>
        </div>
      </div>
    );
  };

  /*
  One recorded lineup change.

  Shown with the day the pool has on record for it, because that date is the
  thing that can be wrong: the scoring reads the latest event on or before each
  day, so an event a month late leaves a month scored with the old lineup. The
  owner and the assistants can move it or take it back from here.
  */
  const LineupEventRow = (change: LineupEventChange) => {
    const { event, isOpening } = change;
    const name = dictUsers[event.participant]?.name ?? event.participant;
    const key = eventKey(event.participant, event.effective_date);
    const isPending = lineupEvents.pendingEvent === key;
    // The opening lineup cannot be moved later or dropped without leaving the
    // pooler unscored until their next change, which the backend refuses — so
    // it is not offered.
    const isEditable = lineupEvents.canEdit && !isOpening;

    return (
      <div key={key} className="rounded-lg border bg-muted/30 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <PoolerNameText
            name={name}
            isYou={event.participant === userPoolUser?.id}
            className="font-semibold"
          />
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock size={14} />
            {isOpening
              ? t("LineupEventOpening")
              : t("LineupEventCountsFrom", {
                  date: formatDate(event.effective_date),
                })}
          </span>
        </div>

        {isOpening ? (
          <p className="text-sm text-muted-foreground">
            {t("LineupEventOpeningDescription")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                <ShieldPlus size={14} />
                {t("IntoTheLineup")}
              </div>
              {change.addedPlayerIds.length > 0 ? (
                change.addedPlayerIds.map(PlayerRow)
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-rose-600 dark:text-rose-400">
                <BadgeMinus size={14} />
                {t("OutOfTheLineup")}
              </div>
              {change.removedPlayerIds.length > 0 ? (
                change.removedPlayerIds.map(PlayerRow)
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </div>
        )}

        {isEditable ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
            <Popover>
              <PopoverTrigger
                render={
                  <Button variant="outline" size="sm" disabled={isPending} />
                }
              >
                {isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <CalendarClock />
                )}
                {t("ChangeLineupEventDate")}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={new Date(`${event.effective_date}T00:00:00`)}
                  defaultMonth={new Date(`${event.effective_date}T00:00:00`)}
                  onSelect={(date) => {
                    if (!date) return;
                    void lineupEvents.reDate(
                      event.participant,
                      event.effective_date,
                      formatDateKey(date),
                    );
                  }}
                  // Opening night through today: before it a lineup has no day
                  // to apply to, after it there is no day scored yet.
                  disabled={{
                    before: new Date(
                      `${lineupEvents.backdateRange.earliestDate}T00:00:00`,
                    ),
                    after: new Date(
                      `${lineupEvents.backdateRange.latestDate}T00:00:00`,
                    ),
                  }}
                  className="rounded-md border shadow-sm"
                  required
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => setEventToDrop(change)}
            >
              <Trash2 />
              {t("DropLineupEvent")}
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  const Movements = (movements: DailyMovements) => (
    <div
      key={movements.participant}
      className="rounded-lg border bg-muted/30 p-3"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
          {movements.participant.slice(0, 2)}
        </span>
        <PoolerNameText
          name={movements.participant}
          isYou={movements.participant === userPoolUser?.name}
          className="font-semibold"
        />
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
      {/* Mounted once rather than per row: only one event is ever being
          dropped, and dropping one is not something to do by accident. */}
      <AlertDialog
        open={eventToDrop !== null}
        onOpenChange={(open) => {
          if (!open) setEventToDrop(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("DropLineupEventConfirmationTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {eventToDrop === null
                ? null
                : t("DropLineupEventConfirmationDescription", {
                    userName:
                      dictUsers[eventToDrop.event.participant]?.name ??
                      eventToDrop.event.participant,
                    date: formatDate(eventToDrop.event.effective_date),
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={lineupEvents.pendingEvent !== null}>
              {t("Cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={lineupEvents.pendingEvent !== null}
              onClick={async () => {
                if (eventToDrop === null) return;
                if (
                  await lineupEvents.drop(
                    eventToDrop.event.participant,
                    eventToDrop.event.effective_date,
                  )
                ) {
                  setEventToDrop(null);
                }
              }}
            >
              {lineupEvents.pendingEvent !== null ? (
                <LoaderCircle className="animate-spin" />
              ) : null}
              {t("DropLineupEvent")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {history.map((dailyHistory) => {
        const changeCount =
          dailyHistory.dailyMovements.length +
          dailyHistory.dailyTrades.length +
          dailyHistory.dailyWaivers.length +
          dailyHistory.dailyLineupEvents.length;
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
                    {dailyHistory.dailyLineupEvents.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <CalendarClock size={14} />
                          {t("RecordedLineupChanges")}
                        </div>
                        {dailyHistory.dailyLineupEvents.map(LineupEventRow)}
                      </div>
                    ) : null}
                    {dailyHistory.dailyLineupEvents.length > 0 &&
                      (dailyHistory.dailyWaivers.length > 0 ||
                        dailyHistory.dailyMovements.length > 0) && (
                        <Separator />
                      )}
                    {dailyHistory.dailyWaivers.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Repeat size={14} />
                          {t("FreeAgency")}
                        </div>
                        {dailyHistory.dailyWaivers.map(WaiverClaimRow)}
                      </div>
                    ) : null}
                    {dailyHistory.dailyWaivers.length > 0 &&
                      dailyHistory.dailyMovements.length > 0 && <Separator />}
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
