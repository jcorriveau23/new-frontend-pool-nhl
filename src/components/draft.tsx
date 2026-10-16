import * as React from "react";
import { Player } from "@/data/pool/model";
import {
  buildDraftBoard,
  draftedPlayerAt,
  DraftRound,
  picksMade,
} from "@/lib/draft-board";
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
import { PoolerNameText } from "./pooler-name";
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

interface DraftProps {
  onPlayerSelect: ((player: Player) => Promise<boolean>) | null;
}

export default function Draft(props: DraftProps) {
  const { dictUsers, poolInfo, playersOwner } = usePoolContext();
  const userData = useUser();
  const t = useTranslations();

  /*
  The board is derived rather than held in state.

  It used to be computed in an effect and stored, which rendered the whole
  draft as a skeleton once on every pick before rendering with the board — and
  it was keyed on the list of drafted players alone, so a pick traded during
  the draft moved the order on the backend and not on screen. It depends on the
  whole pool for that reason: `past_tradable_picks` and the draft order are as
  much a part of the board as the picks already made. The derivation itself
  lives in `@/lib/draft-board`.
  */
  const draftInfo = React.useMemo(() => buildDraftBoard(poolInfo), [poolInfo]);

  const DraftContent = (draftIndex: number) => {
    const player = draftedPlayerAt(poolInfo, draftIndex);
    const teamLogo = team_info[player?.team ?? -1]?.logo;

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
            render={
              <TableCell colSpan={3} className="px-2 py-1.5 sm:px-3 sm:py-2" />
            }
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
                selectLabel={t("Draft")}
                playerLinksInNewTab
                currentSeason={poolInfo.season}
              />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </>
    ) : (
      // Pick that has not been made yet.
      <TableCell
        colSpan={3}
        className="px-2 py-1.5 text-muted-foreground/60 sm:px-3 sm:py-2"
      >
        —
      </TableCell>
    );
  };

  const RoundTable = (round: DraftRound) => (
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
                  <PoolerNameText
                    name={dictUsers[pick.drafter]?.name}
                    isYou={pick.drafter === userData.info?.id}
                    className="font-medium"
                  />
                  {pick.from ? (
                    <Badge
                      variant="outline"
                      className="max-w-[160px] truncate border-dashed px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
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

  const RenderRound = (round: DraftRound, currentRound: number | null) => {
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

  // The board is empty until the pool carries a draft order and a context to
  // read the picks from, which is the only state worth a skeleton: an empty
  // board once they are there is a pool with nothing to draft, not a pool
  // still loading.
  if (poolInfo.draft_order === null || poolInfo.context === null) {
    return <TableSkeleton rows={8} label={t("LoadingDraftInfo")} />;
  }
  return (
    <div className="space-y-4 py-2">
      <DraftStatus
        round={draftInfo.currentRound}
        pickNumber={picksMade(poolInfo) + 1}
        currentDrafter={
          draftInfo.currentDrafter
            ? dictUsers[draftInfo.currentDrafter ?? ""]?.name
            : null
        }
        isUserTurn={draftInfo.currentDrafter === userData.info?.id}
        completedPicks={picksMade(poolInfo)}
        totalPicks={draftInfo.totalPicks}
      />
      <Accordion
        defaultValue={draftInfo.rounds.map((round) => round.round.toString())}
        className="overflow-hidden rounded-xl border bg-card"
      >
        {draftInfo.rounds.map((round) =>
          RenderRound(round, draftInfo.currentRound),
        )}
      </Accordion>
    </div>
  );
}
