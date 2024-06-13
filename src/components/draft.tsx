import * as React from "react";
import { Player, Pool } from "@/data/pool/model";
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

interface Round {
  round: number;

  // from first to last
  drafters: string[];
}

interface Draft {
  rounds: Round[];

  // The user that should draft, null if draft done.
  currentDrafter: string | null;
}

export default function Draft() {
  const [draftInfo, setDraftInfo] = React.useState<Draft | null>(null);
  const { poolInfo } = usePoolContext();
  const t = useTranslations();

  // The max number of players per pooler is always the number of players minus the number of players protected
  // (only dynastie pool as a players protected !== 0)
  const numberPlayersToDraft =
    poolInfo.settings.number_forwards +
    poolInfo.settings.number_defenders +
    poolInfo.settings.number_goalies +
    poolInfo.settings.number_reservists -
    (poolInfo.settings.dynastie_settings
      ?.next_season_number_players_protected ?? 0);

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

    return rounds[currentRoundIndex].drafters[
      totalPlayerDrafted % numberOfPickPerRound
    ];
  };

  const getDynastyRoundDrafters = (
    draftedPlayerCountDictPerPooler: Map<string, number>,
    finalRank: string[],
    roundIndex: number
  ): string[] => {
    const drafters: string[] = [];
    if (!poolInfo.context) {
      return drafters;
    }
    // This is a dynastie type of draft, the final rank is being used as draft order.
    for (let j = 0; j < finalRank.length; j += 1) {
      if (
        poolInfo.context.past_tradable_picks &&
        roundIndex < poolInfo.context.past_tradable_picks.length
      ) {
        // we use tradable picks to find to process the next drafter, we are in the list of tradable picks right now.
        const nextDrafter = finalRank[finalRank.length - 1 - j];

        const realNextDrafter =
          poolInfo.context.past_tradable_picks[roundIndex][nextDrafter];

        draftedPlayerCountDictPerPooler.set(
          realNextDrafter,
          (draftedPlayerCountDictPerPooler.get(realNextDrafter) ?? 0) + 1
        );

        drafters.push(realNextDrafter);
      } else {
        // the next drafter comes from final_rank directly.
        const nextDrafter = finalRank[finalRank.length - 1 - j];
        draftedPlayerCountDictPerPooler.set(
          nextDrafter,
          (draftedPlayerCountDictPerPooler.get(nextDrafter) ?? 0) + 1
        );

        drafters.push(nextDrafter);
      }
    }

    return drafters;
  };

  const getRegularRoundDrafters = (
    draftedPlayerCountDictPerPooler: Map<string, number>,
    participants: string[],
    roundIndex: number,
    isSnakeDraft: boolean
  ): string[] => {
    const drafters: string[] = [];
    for (let j = 0; j < participants.length; j += 1) {
      // Snake draft, reverse draft order each round else always uses participants order.
      const nextDrafter =
        roundIndex % 2 || !isSnakeDraft
          ? participants[participants.length - 1 - j]
          : participants[j];

      drafters.push(nextDrafter);

      draftedPlayerCountDictPerPooler.set(
        nextDrafter,
        (draftedPlayerCountDictPerPooler.get(nextDrafter) ?? 0) + 1
      );
    }

    return drafters;
  };

  const getRounds = (): Round[] => {
    if (poolInfo.participants === null || poolInfo.context === null) {
      return [];
    }

    // 1) Initialize the participants roster count dict to either 0 or
    // to the number of protected players for dynastie type pools.
    const draftedPlayerCountDictPerPooler: Map<string, number> = new Map();

    // 2) Parse the pool draft settings to looping until the draft is done.
    const rounds: Round[] = [];
    let roundIndex = 0; // roundIndex + 1 = round #
    while (
      !isDraftDone(draftedPlayerCountDictPerPooler, poolInfo.participants)
    ) {
      // The drafters for this round
      let drafters: string[] = [];

      // The list of drafters for the specific round.
      if (poolInfo.final_rank) {
        // This comes from a dynastie draft.
        drafters = getDynastyRoundDrafters(
          draftedPlayerCountDictPerPooler,
          poolInfo.final_rank,
          roundIndex
        );
      } else {
        // This is logic is for new drafts.
        drafters = getRegularRoundDrafters(
          draftedPlayerCountDictPerPooler,
          poolInfo.participants,
          roundIndex,
          true
        );
      }

      rounds.push({ round: roundIndex + 1, drafters });
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
        {round.drafters.map((drafter, i) => {
          const draftIndex = (round.round - 1) * round.drafters.length + i;
          const teamLogo =
            team_info[getDraftedPlayer(draftIndex)?.team ?? -1]?.logo;

          return (
            <TableRow key={draftIndex + 1}>
              <TableCell>{draftIndex + 1}</TableCell>
              <TableCell>{drafter}</TableCell>
              <TableCell>
                <PlayerLink
                  name={getDraftedPlayer(draftIndex)?.name}
                  id={getDraftedPlayer(draftIndex)?.id}
                  textStyle={null}
                />
              </TableCell>
              <TableCell>{getDraftedPlayer(draftIndex)?.position}</TableCell>
              <TableCell>
                {teamLogo ? (
                  <Image width={30} height={30} alt="" src={teamLogo} />
                ) : null}
              </TableCell>
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
    return <h1>Loading...</h1>;
  }
  return draftInfo.rounds.map((round) => RenderRound(round));
}
