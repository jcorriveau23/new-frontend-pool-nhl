"use client";

import * as React from "react";
import {
  DraftPick,
  Player,
  Pool,
  PoolUser,
  Position,
  Trade,
  TradeStatus,
  getPoolerAllPlayers,
} from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";
import { hasPoolPrivilege, usePoolContext } from "@/context/pool-context";
import { useUser } from "@/context/useUserData";
import { useSession } from "@/context/useSessionData";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PlayerSalary from "@/components/player-salary";
import { ArrowLeftRight, Info } from "lucide-react";
import { ordinal } from "@/app/utils/formating";

export const pickKey = (pick: DraftPick) => `${pick.round}-${pick.from}`;

// An asset the dialog can be opened on, so the trade starts pre-filled with
// the player or the pick the user clicked somewhere else in the pool.
export interface TradeAsset {
  // Pooler currently owning the asset.
  poolerId: string;
  playerId?: number;
  pick?: DraftPick;
}

interface TradeSideSelectorProps {
  pooler: PoolUser;
  selectedPlayers: Set<number>;
  selectedPicks: Set<string>;
  togglePlayer: (playerId: number) => void;
  togglePick: (pick: DraftPick) => void;
}

// Two headline stats only: a trade is built on the players you already know,
// the full stat sheet lives in the pool tables.
const PlayerStatLine = ({ player }: { player: Player }) => {
  const t = useTranslations();

  const stats =
    player.position === Position.G
      ? [
          `${player.wins ?? 0} ${t("W")}`,
          player.save_percentage != null
            ? `${player.save_percentage.toFixed(3)} ${t("SvPct")}`
            : `${player.game_played ?? 0} ${t("GP")}`,
        ]
      : [
          `${player.points ?? 0} ${t("Pts")}`,
          `${player.game_played ?? 0} ${t("GP")}`,
        ];

  return (
    <span className="text-xs text-muted-foreground">{stats.join(" · ")}</span>
  );
};

// Cap hit of a player, using the same badge as the pool tables: the contract
// expiration stays out of the line and is one click away in the popover.
const PlayerCapHit = ({ player }: { player: Player }) => (
  <div className="shrink-0">
    <PlayerSalary
      playerName={player.name}
      team={player.team}
      salary={player.salary_cap}
      contractExpirationSeason={player.contract_expiration_season}
      // The row is a <label> driving the checkbox: opening the salary details
      // must not select the player.
      onBadgeClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    />
  </div>
);

function TradeSideSelector(props: TradeSideSelectorProps) {
  const { poolInfo, dictUsers } = usePoolContext();
  const t = useTranslations();

  if (!poolInfo.context) {
    return null;
  }

  const salaryCapEnabled = poolInfo.settings.salary_cap != null;
  const roster = getPoolerAllPlayers(poolInfo.context, props.pooler);
  const picks = getPoolerPicks(
    poolInfo.context.tradable_picks,
    props.pooler.id,
  );

  const PlayerGroup = (label: string, players: Player[]) =>
    players.length > 0 ? (
      <div className="space-y-1">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {players.map((player) => {
          const checked = props.selectedPlayers.has(player.id);
          return (
            <label
              key={player.id}
              className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-accent"
            >
              <Checkbox
                className="mt-0.5"
                checked={checked}
                onCheckedChange={() => props.togglePlayer(player.id)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {player.name}
                  </span>
                  {salaryCapEnabled ? <PlayerCapHit player={player} /> : null}
                </div>
                <PlayerStatLine player={player} />
              </div>
            </label>
          );
        })}
      </div>
    ) : null;

  return (
    <div className="space-y-3">
      <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3">
        {PlayerGroup(t("Forwards"), roster.forwards)}
        {PlayerGroup(t("Defense"), roster.defense)}
        {PlayerGroup(t("Goalies"), roster.goalies)}
        {picks.length > 0 ? (
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("DraftPicks")}
            </div>
            {picks.map((pick) => {
              const checked = props.selectedPicks.has(pickKey(pick));
              return (
                <label
                  key={pickKey(pick)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => props.togglePick(pick)}
                  />
                  <span className="truncate">
                    {ordinal(pick.round + 1)} ({dictUsers[pick.from]?.name})
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}
        {roster.forwards.length === 0 &&
        roster.defense.length === 0 &&
        roster.goalies.length === 0 &&
        picks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("NoPlayers")}</p>
        ) : null}
      </div>
    </div>
  );
}

// Return the list of draft picks a pooler currently owns, based on the pool
// tradable_picks (indexed by round, mapping the original owner to the current
// owner).
export const getPoolerPicks = (
  tradablePicks: Record<string, string>[] | null | undefined,
  poolerId: string,
): DraftPick[] => {
  const picks: DraftPick[] = [];
  tradablePicks?.forEach((roundPicksOwner, round) => {
    Object.keys(roundPicksOwner).forEach((from) => {
      if (roundPicksOwner[from] === poolerId) {
        picks.push({ round, from });
      }
    });
  });
  return picks;
};

interface CreateTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Asset the dialog opens on, pre-selected on the right side of the trade.
  initialAsset?: TradeAsset | null;
}

export default function CreateTradeDialog(props: CreateTradeDialogProps) {
  const { poolInfo, updatePoolInfo, dictUsers } = usePoolContext();
  const userData = useUser();
  const userSession = useSession();
  const t = useTranslations();

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Poolers the current user is allowed to propose a trade on behalf of. A
  // regular user only manages his own team; an owner/assistant manages all.
  const manageableParticipants = React.useMemo(
    () =>
      poolInfo.participants.filter(
        (p) =>
          userData.info?.id === p.id ||
          hasPoolPrivilege(userData.info?.id, poolInfo),
      ),
    [poolInfo, userData.info?.id],
  );

  // A visitor that manages no team can still build a trade to see what it
  // would look like, he simply cannot send it.
  const canSubmit =
    Boolean(userSession.info?.jwt) && manageableParticipants.length > 0;
  const fromParticipants =
    manageableParticipants.length > 0
      ? manageableParticipants
      : poolInfo.participants;

  const [fromPoolerId, setFromPoolerId] = React.useState<string>("");
  const [toPoolerId, setToPoolerId] = React.useState<string>("");
  const [fromPlayers, setFromPlayers] = React.useState<Set<number>>(new Set());
  const [toPlayers, setToPlayers] = React.useState<Set<number>>(new Set());
  const [fromPicks, setFromPicks] = React.useState<Set<string>>(new Set());
  const [toPicks, setToPicks] = React.useState<Set<string>>(new Set());

  const resetSelection = () => {
    setFromPlayers(new Set());
    setToPlayers(new Set());
    setFromPicks(new Set());
    setToPicks(new Set());
  };

  React.useEffect(() => {
    if (!props.open) {
      return;
    }

    const asset = props.initialAsset;
    const defaultFrom =
      fromParticipants.find((p) => p.id === userData.info?.id)?.id ??
      fromParticipants[0]?.id ??
      "";

    // The asset lands on the side of the pooler owning it: on the user's own
    // side when he manages that team, on the partner side otherwise.
    const assetOnFromSide =
      asset != null &&
      (asset.poolerId === defaultFrom ||
        fromParticipants.some((p) => p.id === asset.poolerId));

    const from = assetOnFromSide ? asset!.poolerId : defaultFrom;
    const to =
      asset != null && !assetOnFromSide
        ? asset.poolerId
        : (poolInfo.participants.find((p) => p.id !== from)?.id ?? "");

    setFromPoolerId(from);
    setToPoolerId(to);

    resetSelection();
    if (asset?.playerId != null) {
      const selection = new Set([asset.playerId]);
      if (assetOnFromSide) setFromPlayers(selection);
      else setToPlayers(selection);
    }
    if (asset?.pick) {
      const selection = new Set([pickKey(asset.pick)]);
      if (assetOnFromSide) setFromPicks(selection);
      else setToPicks(selection);
    }
    // Only re-initialise when the dialog opens on a new asset, so the user
    // selection is never wiped while they are building the trade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, props.initialAsset]);

  const toggle = <T,>(
    setter: React.Dispatch<React.SetStateAction<Set<T>>>,
    value: T,
  ) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });

  const fromPooler = poolInfo.participants.find((p) => p.id === fromPoolerId);
  const toPooler = poolInfo.participants.find((p) => p.id === toPoolerId);

  const nbSelected =
    fromPlayers.size + toPlayers.size + fromPicks.size + toPicks.size;

  const selectedPicksFor = (
    poolerId: string,
    selected: Set<string>,
  ): DraftPick[] =>
    getPoolerPicks(poolInfo.context?.tradable_picks, poolerId).filter((pick) =>
      selected.has(pickKey(pick)),
    );

  const onSubmit = async () => {
    if (!userSession.info?.jwt) {
      toast.error(t("LoginToTrade"), { duration: 3000 });
      return;
    }
    if (!fromPooler || !toPooler) {
      return;
    }
    if (fromPooler.id === toPooler.id) {
      toast.error(t("SamePoolerTradeError"), { duration: 3000 });
      return;
    }
    if (nbSelected === 0) {
      toast.error(t("SelectAtLeastOneAsset"), { duration: 3000 });
      return;
    }

    const trade: Trade = {
      proposed_by: fromPooler.id,
      ask_to: toPooler.id,
      from_items: {
        players: Array.from(fromPlayers),
        picks: selectedPicksFor(fromPooler.id, fromPicks),
      },
      to_items: {
        players: Array.from(toPlayers),
        picks: selectedPicksFor(toPooler.id, toPicks),
      },
      status: TradeStatus.NEW,
      id: 0,
      date_created: 0,
      date_accepted: 0,
    };

    setIsSubmitting(true);
    try {
      const res = await apiPost<Pool>(
        "/create-trade",
        { pool_name: poolInfo.name, trade },
        userSession.info.jwt,
      );

      if (!res.ok) {
        toast.error(
          t("CouldNotCreateTrade", { name: poolInfo.name, error: res.error }),
          { duration: 5000 },
        );
        return;
      }

      updatePoolInfo(res.data);
      toast.success(t("TradeProposalCreated"), { duration: 2000 });
      props.onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            {t("ProposeTrade")}
          </DialogTitle>
          <DialogDescription>{t("SelectPoolerToTradeWith")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* From side */}
            <div className="space-y-2">
              <Label>{canSubmit ? t("YourTeam") : t("FirstTeam")}</Label>
              {fromParticipants.length > 1 ? (
                <Select
                  value={fromPoolerId}
                  items={fromParticipants.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  onValueChange={(value) => {
                    if (value === null) return;
                    setFromPoolerId(value as string);
                    if (value === toPoolerId) {
                      setToPoolerId(
                        poolInfo.participants.find((p) => p.id !== value)?.id ??
                          "",
                      );
                    }
                    resetSelection();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("YourTeam")} />
                  </SelectTrigger>
                  <SelectContent>
                    {fromParticipants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                  {fromPooler?.name ?? "—"}
                </div>
              )}
              {fromPooler ? (
                <TradeSideSelector
                  pooler={fromPooler}
                  selectedPlayers={fromPlayers}
                  selectedPicks={fromPicks}
                  togglePlayer={(id) => toggle(setFromPlayers, id)}
                  togglePick={(pick) => toggle(setFromPicks, pickKey(pick))}
                />
              ) : null}
            </div>

            {/* To side */}
            <div className="space-y-2">
              <Label>{t("TradePartner")}</Label>
              <Select
                value={toPoolerId}
                items={poolInfo.participants
                  .filter((p) => p.id !== fromPoolerId)
                  .map((p) => ({ value: p.id, label: p.name }))}
                onValueChange={(value) => {
                  if (value === null) return;
                  setToPoolerId(value as string);
                  resetSelection();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("TradePartner")} />
                </SelectTrigger>
                <SelectContent>
                  {poolInfo.participants
                    .filter((p) => p.id !== fromPoolerId)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {toPooler ? (
                <TradeSideSelector
                  pooler={toPooler}
                  selectedPlayers={toPlayers}
                  selectedPicks={toPicks}
                  togglePlayer={(id) => toggle(setToPlayers, id)}
                  togglePick={(pick) => toggle(setToPicks, pickKey(pick))}
                />
              ) : null}
            </div>
          </div>

          {nbSelected > 0 && fromPooler && toPooler ? (
            <>
              <Separator className="my-4" />
              <div className="grid gap-3 text-left sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {fromPooler.name} {t("Gives")}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(fromPlayers).map((id) => (
                      <Badge key={id}>
                        {poolInfo.context?.players[id]?.name}
                      </Badge>
                    ))}
                    {selectedPicksFor(fromPooler.id, fromPicks).map((pick) => (
                      <Badge key={pickKey(pick)} variant="secondary">
                        {ordinal(pick.round + 1)} ({dictUsers[pick.from]?.name})
                      </Badge>
                    ))}
                    {fromPlayers.size + fromPicks.size === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {toPooler.name} {t("Gives")}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(toPlayers).map((id) => (
                      <Badge key={id}>
                        {poolInfo.context?.players[id]?.name}
                      </Badge>
                    ))}
                    {selectedPicksFor(toPooler.id, toPicks).map((pick) => (
                      <Badge key={pickKey(pick)} variant="secondary">
                        {ordinal(pick.round + 1)} ({dictUsers[pick.from]?.name})
                      </Badge>
                    ))}
                    {toPlayers.size + toPicks.size === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter className="flex-col items-stretch gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          {canSubmit ? (
            <span />
          ) : (
            <span className="flex items-center gap-2 text-left text-xs text-muted-foreground">
              <Info className="size-4 shrink-0" />
              {t("TradeSimulationOnly")}
            </span>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => props.onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={onSubmit}
              disabled={
                !canSubmit ||
                isSubmitting ||
                nbSelected === 0 ||
                !fromPooler ||
                !toPooler ||
                fromPooler.id === toPooler.id
              }
            >
              {t("ProposeTrade")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
