import * as React from "react";
import { Player } from "@/data/pool/model";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePoolContext } from "@/context/pool-context";
import PlayerLink from "@/components/player-link";
import team_info from "@/lib/teams";
import { TeamLogo } from "./team-logo";
import { useTranslations } from "next-intl";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Badge } from "./ui/badge";
import DraftStatus from "./draft-status";
import { YouBadge } from "./pooler-name";
import DraftButton from "./draft-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import PlayersTable from "./player-table";
import { useUser } from "@/context/useUserData";

interface Pick {
  drafter: string;
  from: string | null;
  done?: boolean | null;
}

interface Round {
  round: number;

  // from first to last
  picks: Pick[];
}

interface Draft {
  rounds: Round[];

  // The user that should draft, null if draft done.
  currentDrafter: string | null;
  currentRound: number | null;

  // Total number of picks of the whole draft.
  totalPicks: number;
}

interface DraftProps {
  onPlayerSelect: ((player: Player) => Promise<boolean>) | null;
}

export default function Draft(props: DraftProps) {
  const [draftInfo, setDraftInfo] = React.useState<Draft | null>(null);
  const { dictUsers, poolInfo, playersOwner } = usePoolContext();
  const userData = useUser();
  const t = useTranslations();

  // The max number of players per pooler is always the number of players minus the number of players protected
  // (only dynasty pool as a players protected !== 0)
  const numberPlayersToDraft =
    poolInfo.settings.number_forwards +
    poolInfo.settings.number_defenders +
    poolInfo.settings.number_goalies +
    poolInfo.settings.number_reservists -
    (poolInfo.settings.dynasty_settings?.next_season_number_players_protected ??
      0);

  const numberOfPickPerRound = poolInfo.settings.number_poolers;

  const isDraftDone = (
    draftedPlayerCountDictPerPooler: Map<string, number>,
    participants: string[]
  ) => {
    for (let i = 0; i < participants.length; i += 1) {
      if (
        (draftedPlayerCountDictPerPooler.get(participants[i]) ?? 0) <
        numberPlayersToDraft
      ) {
        return false;
      }
    }
    return true;
  };

  // Return the drafted player info for a specific draft index.
  const getDraftedPlayer = (draftIndex: number): Player | null =>
    poolInfo.context?.players[
      poolInfo.context?.players_name_drafted[draftIndex]
    ] ?? null;

  const getCurrentRoundIndex = (): number | null => {
    // Return the current round. will be null if the draft is completed/
    const totalPlayerDrafted =
      poolInfo.context?.players_name_drafted.length ?? 0;

    if (totalPlayerDrafted >= numberOfPickPerRound * numberPlayersToDraft) {
      return null;
    }

    return Math.floor(totalPlayerDrafted / numberOfPickPerRound);
  };

  const getCurrentDrafter = (rounds: Round[]): string | null => {
    // Return the current drafter. Will be null if the draft is completed.
    const totalPlayerDrafted =
      poolInfo.context?.players_name_drafted.length ?? 0;

    const currentRoundIndex = getCurrentRoundIndex();
    if (currentRoundIndex === null) {
      return null;
    }

    return rounds[currentRoundIndex].picks[
      totalPlayerDrafted % numberOfPickPerRound
    ].drafter;
  };

  const getDynastyRoundDrafters = (
    draftedPlayerCountDictPerPooler: Map<string, number>,
    draftOrder: string[],
    roundIndex: number
  ): Pick[] => {
    const drafters: Pick[] = [];
    if (!poolInfo.context) {
      return drafters;
    }

    for (let i = 0; i < draftOrder.length; i += 1) {
      if (
        poolInfo.context.past_tradable_picks &&
        roundIndex < poolInfo.context.past_tradable_picks.length
      ) {
        // we use tradable picks to find to process the next drafter, we are in the list of tradable picks right now.
        const nextDrafter = draftOrder[i];

        const realNextDrafter =
          poolInfo.context.past_tradable_picks[roundIndex][nextDrafter];

        draftedPlayerCountDictPerPooler.set(
          realNextDrafter,
          (draftedPlayerCountDictPerPooler.get(realNextDrafter) ?? 0) + 1
        );

        drafters.push({
          drafter: realNextDrafter,
          from: realNextDrafter === nextDrafter ? null : nextDrafter,
        });
      } else {
        // the next drafter comes from draft order directly.
        const nextDrafter = draftOrder[i];
        draftedPlayerCountDictPerPooler.set(
          nextDrafter,
          (draftedPlayerCountDictPerPooler.get(nextDrafter) ?? 0) + 1
        );

        drafters.push({
          drafter: nextDrafter,
          from: null,
          done:
            (draftedPlayerCountDictPerPooler.get(nextDrafter) ?? 0) >
            numberPlayersToDraft,
        });
      }
    }

    return drafters;
  };

  const getRegularRoundDrafters = (
    draftedPlayerCountDictPerPooler: Map<string, number>,
    participants: string[],
    roundIndex: number,
    isSnakeDraft: boolean
  ): Pick[] => {
    const drafters: Pick[] = [];
    for (let j = 0; j < participants.length; j += 1) {
      // Snake draft, reverse draft order each round else always uses participants order.
      const nextDrafter =
        roundIndex % 2 || !isSnakeDraft
          ? participants[participants.length - 1 - j]
          : participants[j];

      drafters.push({ drafter: nextDrafter, from: null });

      draftedPlayerCountDictPerPooler.set(
        nextDrafter,
        (draftedPlayerCountDictPerPooler.get(nextDrafter) ?? 0) + 1
      );
    }

    return drafters;
  };

  const getRounds = (): Round[] => {
    if (poolInfo.draft_order === null || poolInfo.context === null) {
      return [];
    }

    // 1) Initialize the participants roster count dict to either 0 or
    // to the number of protected players for dynasty type pools.
    const draftedPlayerCountDictPerPooler: Map<string, number> = new Map();

    // 2) Parse the pool draft settings to looping until the draft is done.
    const rounds: Round[] = [];
    let roundIndex = 0; // roundIndex + 1 = round #

    while (
      !isDraftDone(draftedPlayerCountDictPerPooler, poolInfo.draft_order)
    ) {
      // The drafters for this round
      let drafters: Pick[] = [];

      // The list of drafters for the specific round.
      if (
        poolInfo.settings.dynasty_settings &&
        poolInfo.context?.past_tradable_picks
      ) {
        // This comes from a dynasty draft.
        drafters = getDynastyRoundDrafters(
          draftedPlayerCountDictPerPooler,
          poolInfo.draft_order,
          roundIndex
        );
      } else {
        // This is logic is for new drafts.
        drafters = getRegularRoundDrafters(
          draftedPlayerCountDictPerPooler,
          poolInfo.draft_order,
          roundIndex,
          true
        );
      }

      rounds.push({ round: roundIndex + 1, picks: drafters });
      roundIndex += 1;
    }

    return rounds;
  };

  const DraftContent = (draftIndex: number) => {
    const teamLogo = team_info[getDraftedPlayer(draftIndex)?.team ?? -1]?.logo;
    const player = getDraftedPlayer(draftIndex);

    return player ? (
      <>
        <TableCell className="px-2 py-1.5 sm:px-3 sm:py-2">
          <PlayerLink name={player.name} id={player.id} textStyle={null} />
        </TableCell>
        <TableCell className="px-2 py-1.5 text-center sm:px-3 sm:py-2">
          <span className="inline-flex h-5 min-w-6 items-center justify-center rounded-md border bg-muted/50 px-1.5 text-xs font-medium">
            {player.position}
          </span>
        </TableCell>
        <TableCell className="px-2 py-1.5 sm:px-3 sm:py-2">
          <div className="flex justify-center">
            <TeamLogo width={26} height={26} src={teamLogo} />
          </div>
        </TableCell>
      </>
    ) : player === null &&
      props.onPlayerSelect &&
      draftIndex === poolInfo.context?.players_name_drafted.length ? (
      <>
        <Dialog>
          <DialogTrigger
            nativeButton={false}
            render={<TableCell colSpan={3} className="px-2 py-1.5 sm:px-3 sm:py-2" />}
          >
            <DraftButton label="Draft Player" />
          </DialogTrigger>
          <DialogContent className="h-full max-h-[96%] p-4 w-full max-w-[96%]">
            <DialogHeader>
              <DialogTitle>{t("DraftAPlayer")}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="p-0">
              <PlayersTable
                sortField={"points"}
                skip={null}
                limit={null}
                considerOnlyProtected={false}
                pushUrl={`/pool/${poolInfo.name}`}
                playersOwner={playersOwner}
                protectedPlayers={null}
                onPlayerSelect={props.onPlayerSelect}
              />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </>
    ) : (
      // Pick that has not been made yet.
      <TableCell colSpan={3} className="px-2 py-1.5 text-muted-foreground/60 sm:px-3 sm:py-2">
        —
      </TableCell>
    );
  };

  const RoundTable = (round: Round) => (
    <Table className="border-t">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-8 w-10 pl-3 pr-1.5 text-right text-[11px] font-normal sm:h-9 sm:w-12 sm:pl-4 sm:pr-2 sm:text-sm">
            #
          </TableHead>
          <TableHead className="h-8 px-2 text-[11px] font-normal sm:h-9 sm:px-3 sm:text-sm">
            Pooler
          </TableHead>
          <TableHead className="h-8 px-2 text-[11px] font-normal sm:h-9 sm:px-3 sm:text-sm">
            {t("Player")}
          </TableHead>
          <TableHead className="h-8 w-14 px-2 text-center text-[11px] font-normal sm:h-9 sm:w-20 sm:px-3 sm:text-sm">
            {t("Position")}
          </TableHead>
          <TableHead className="h-8 w-12 px-2 text-center text-[11px] font-normal sm:h-9 sm:w-16 sm:px-3 sm:text-sm">
            {t("T")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {round.picks.map((pick, i) => {
          const draftIndex = (round.round - 1) * round.picks.length + i;
          const isCurrentPick =
            draftIndex === poolInfo.context?.players_name_drafted.length;

          return (
            <TableRow
              key={draftIndex + 1}
              className={
                isCurrentPick
                  ? "border-b-0 bg-primary/10 hover:bg-primary/15"
                  : "border-b-0 odd:bg-muted/30"
              }
            >
              <TableCell className="py-1.5 pl-3 pr-1.5 text-right tabular-nums text-muted-foreground sm:py-2 sm:pl-4 sm:pr-2">
                {draftIndex + 1}
              </TableCell>
              <TableCell className="px-2 py-1.5 sm:px-3 sm:py-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">
                    {dictUsers[pick.drafter]?.name}
                  </span>
                  {pick.drafter === userData.info?.id ? <YouBadge /> : null}
                  {pick.from ? (
                    <Badge
                      variant="outline"
                      className="border-dashed px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                    >
                      {t("FromPickTraded", {
                        poolerName: dictUsers[pick.from]?.name,
                      })}
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              {pick.done ? (
                <TableCell
                  colSpan={3}
                  className="px-2 py-1.5 text-muted-foreground sm:px-3 sm:py-2"
                >
                  {t("RosterComplete")}
                </TableCell>
              ) : (
                DraftContent(draftIndex)
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const RenderRound = (round: Round, currentRound: number | null) => {
    const firstPick = (round.round - 1) * round.picks.length + 1;
    const lastPick = firstPick + round.picks.length - 1;

    return (
      <AccordionItem
        key={round.round}
        value={round.round.toString()}
        className="border-b last:border-b-0"
      >
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold">
              {t("Round")} #{round.round}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {firstPick}–{lastPick}
            </span>
            {round.round === currentRound ? (
              <Badge
                variant="outline"
                className="border-primary/40 px-2 py-0 text-[10px] font-medium text-primary"
              >
                {t("InProgress")}
              </Badge>
            ) : null}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-0">
          {RoundTable(round)}
        </AccordionContent>
      </AccordionItem>
    );
  };

  React.useEffect(() => {
    const rounds = getRounds();
    const roundIndex = getCurrentRoundIndex();

    setDraftInfo({
      rounds,
      currentDrafter: getCurrentDrafter(rounds),
      currentRound: roundIndex !== null ? roundIndex + 1 : null,
      totalPicks: rounds.reduce(
        (total, round) =>
          total + round.picks.filter((pick) => !pick.done).length,
        0
      ),
    });
    // The three helpers are re-created on every render; the draft board only
    // needs recomputing when a pick is made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolInfo.context?.players_name_drafted]);

  if (draftInfo === null) {
    return <TableSkeleton rows={8} label={t("LoadingDraftInfo")} />;
  }
  return (
    <div className="space-y-4 py-2">
      <DraftStatus
        round={draftInfo.currentRound}
        pickNumber={(poolInfo.context?.players_name_drafted.length ?? 0) + 1}
        currentDrafter={
          draftInfo.currentDrafter
            ? dictUsers[draftInfo.currentDrafter ?? ""]?.name
            : null
        }
        isUserTurn={draftInfo.currentDrafter === userData.info?.id}
        completedPicks={poolInfo.context?.players_name_drafted.length ?? 0}
        totalPicks={draftInfo.totalPicks}
      />
      <Accordion
        defaultValue={draftInfo.rounds.map((round) => round.round.toString())}
        className="overflow-hidden rounded-xl border bg-card"
      >
        {draftInfo.rounds.map((round) =>
          RenderRound(round, draftInfo.currentRound)
        )}
      </Accordion>
    </div>
  );
}
