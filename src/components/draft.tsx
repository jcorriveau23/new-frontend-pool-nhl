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
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Badge } from "./ui/badge";

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
}

export default function Draft() {
  const [draftInfo, setDraftInfo] = React.useState<Draft | null>(null);
  const { dictUsers, poolInfo } = usePoolContext();
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

  const getCurrentRoundIndex = (
    numberOfPickPerRound: number
  ): number | null => {
    // Return the current round. will be null if the draft is completed/
    const totalPlayerDrafted =
      poolInfo.context?.players_name_drafted.length ?? 0;

    if (totalPlayerDrafted >= numberOfPickPerRound * numberPlayersToDraft) {
      return null;
    }

    return Math.floor(totalPlayerDrafted / numberOfPickPerRound);
  };

  const getCurrentDrafter = (
    rounds: Round[],
    numberOfPickPerRound: number
  ): string | null => {
    // Return the current drafter. Will be null if the draft is completed.
    const totalPlayerDrafted =
      poolInfo.context?.players_name_drafted.length ?? 0;

    const currentRoundIndex = getCurrentRoundIndex(numberOfPickPerRound);
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
    // This is a dynasty type of draft, the final rank is being used as draft order.
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

  const RoundTable = (round: Round) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Pooler</TableHead>
          <TableHead>{t("Player")}</TableHead>
          <TableHead>{t("Position")}</TableHead>
          <TableHead>{t("T")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {round.picks.map((pick, i) => {
          const draftIndex = (round.round - 1) * round.picks.length + i;
          const teamLogo =
            team_info[getDraftedPlayer(draftIndex)?.team ?? -1]?.logo;

          return (
            <TableRow key={draftIndex + 1}>
              <TableCell>{draftIndex + 1}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <div>{dictUsers[pick.drafter].name}</div>
                  <div>
                    {pick.from ? (
                      <Badge>
                        {t("FromPickTraded", {
                          poolerName: dictUsers[pick.from].name,
                        })}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              {pick.done ? (
                <TableCell colSpan={3}>Done</TableCell>
              ) : (
                <>
                  <TableCell>
                    <PlayerLink
                      name={getDraftedPlayer(draftIndex)?.name}
                      id={getDraftedPlayer(draftIndex)?.id}
                      textStyle={null}
                    />
                  </TableCell>
                  <TableCell>
                    {getDraftedPlayer(draftIndex)?.position}
                  </TableCell>
                  <TableCell>
                    {teamLogo ? (
                      <Image width={30} height={30} alt="" src={teamLogo} />
                    ) : null}
                  </TableCell>
                </>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const RenderRound = (round: Round) => (
    <Accordion
      key={round.round}
      type="single"
      collapsible
      defaultValue={round.round.toString()}
    >
      <AccordionItem value={round.round.toString()}>
        <AccordionTrigger> Round #{round.round}</AccordionTrigger>
        <AccordionContent>{RoundTable(round)}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  React.useEffect(() => {
    const rounds = getRounds();

    setDraftInfo({
      rounds,
      currentDrafter: getCurrentDrafter(
        rounds,
        poolInfo.participants?.length ?? 0
      ),
    });
  }, [poolInfo.context?.players_name_drafted]);

  if (draftInfo === null) {
    return <h1>Loading draft info...</h1>;
  }
  return draftInfo.rounds.map((round) => RenderRound(round));
}
