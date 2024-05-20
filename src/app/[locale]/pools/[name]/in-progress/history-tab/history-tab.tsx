import * as React from "react";
import { Pool, Trade } from "@/data/pool/model";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ShieldPlus, BadgeMinus } from "lucide-react";
import PlayerLink from "@/components/player-link";
import { usePoolContext } from "@/context/pool-context";
import { useTranslations } from "next-intl";
import { TradeItem } from "@/components/trade";

interface Props {
  poolInfo: Pool;
}

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

export default function HistoryTab(props: Props) {
  const { dictUsers } = usePoolContext();
  const t = useTranslations();
  const [history, setHistory] = React.useState<DailyHistory[] | null>(null);

  const getDailyMovement = (
    participant: string,
    oldRoster: string[],
    newRoster: string[]
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
    if (!props.poolInfo.context?.score_by_day?.[jDate]) {
      return [];
    }

    const forwards = Object.keys(
      props.poolInfo.context.score_by_day[jDate][participant].roster.F
    );
    const defenders = Object.keys(
      props.poolInfo.context.score_by_day[jDate][participant].roster.D
    );
    const goalies = Object.keys(
      props.poolInfo.context.score_by_day[jDate][participant].roster.G
    );
    return forwards.concat(defenders, goalies);
  };

  const getLatestRoster = (participant: string): string[] => {
    // Get the current roster of a participant.
    if (!props.poolInfo.context?.pooler_roster[participant]) {
      return [];
    }
    const forwards = props.poolInfo.context.pooler_roster[
      participant
    ].chosen_forwards.map((playerId) => playerId.toString());
    const defenders = props.poolInfo.context.pooler_roster[
      participant
    ].chosen_defenders.map((playerId) => playerId.toString());
    const goalies = props.poolInfo.context.pooler_roster[
      participant
    ].chosen_goalies.map((playerId) => playerId.toString());

    return forwards.concat(defenders, goalies);
  };

  const GetAllHistory = async () => {
    // Parse all history of the pool.
    console.log("test");
    if (
      props.poolInfo.context === null ||
      props.poolInfo.participants === null
    ) {
      return null;
    }

    const startDate = new Date(props.poolInfo.season_start);
    const endDate = new Date();

    const currentRoster: Map<string, string[]> = new Map();
    const historyTmp: DailyHistory[] = [];

    for (let j = startDate; j <= endDate; j.setDate(j.getDate() + 1)) {
      const jDate = j.toISOString().slice(0, 10);

      const dailyMovements = []; // Will capture all movement that happened on this date.
      const dailyTrades =
        props.poolInfo.trades?.filter(
          (trade) =>
            trade.status === "ACCEPTED" &&
            new Date(trade.date_accepted + 3600000)
              .toISOString()
              .slice(0, 10) === jDate
        ) ?? [];

      if (
        props.poolInfo.context.score_by_day &&
        props.poolInfo.context.score_by_day[jDate] &&
        props.poolInfo.participants
      ) {
        for (let i = 0; i < props.poolInfo.participants.length; i += 1) {
          const participant = props.poolInfo.participants[i];
          const newRoster = getDailyRoster(participant, jDate);

          const oldRoster = currentRoster.get(participant);

          if (oldRoster) {
            // see if a changes was made to the roster and note it in historyTmp.
            const movements = getDailyMovement(
              participant,
              oldRoster,
              newRoster
            );
            if (movements !== null) {
              dailyMovements.push(movements);
            }
          }

          // update the current roster.
          currentRoster.set(participant, newRoster);
        }

        if (dailyMovements.length > 0 || dailyTrades.length > 0) {
          historyTmp.unshift({ date: jDate, dailyMovements, dailyTrades });
        }
      }
    }

    // Make sure that we count current roster (for days that roster modifications are allowed we will see them in real time)
    // TODO: this could be generalize by creating a function centralizing logic between this and the for loop above.
    const dailyMovements = []; // Will capture all movement that happened on this date.
    for (let i = 0; i < props.poolInfo.participants.length; i += 1) {
      const participant = props.poolInfo.participants[i];

      const latestRoster = getLatestRoster(participant);
      const oldRoster = currentRoster.get(participant);

      if (oldRoster) {
        // see if a changes was made to the roster and note it in historyTmp.
        const movements = getDailyMovement(
          participant,
          oldRoster,
          latestRoster
        );
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
    return <h1>test</h1>;
  }

  const Movements = (movements: DailyMovements) => (
    <div key={movements.participant} className="border space-y-4">
      <div>
        <h1 className="text-lg">{dictUsers[movements.participant]}</h1>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          {movements.addedPlayerIds.map((playerId) => (
            <div key={playerId}>
              <div className="flex">
                <ShieldPlus size={20} color="green" />
                <PlayerLink
                  name={`${
                    props.poolInfo.context?.players[playerId].name
                  }  (${t(
                    props.poolInfo.context?.players[playerId].position
                  )})`}
                  id={Number(playerId)}
                  textStyle=""
                />
              </div>
            </div>
          ))}
        </div>
        <div>
          {movements.removedPlayerIds.map((playerId) => (
            <div key={playerId}>
              <div className="flex">
                <BadgeMinus size={20} color="red" />
                <PlayerLink
                  name={`${
                    props.poolInfo.context?.players[playerId].name
                  }  (${t(
                    props.poolInfo.context?.players[playerId].position
                  )})`}
                  id={Number(playerId)}
                  textStyle=""
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return history.map((dailyHistory) => (
    <Accordion
      key={dailyHistory.date}
      type="single"
      collapsible
      defaultValue={dailyHistory.date}
    >
      <AccordionItem value={dailyHistory.date}>
        <AccordionTrigger>{dailyHistory.date}</AccordionTrigger>
        <AccordionContent>
          {dailyHistory.dailyMovements.map((movements) => Movements(movements))}
          {dailyHistory.dailyTrades.map((trade) => (
            <TradeItem key={trade.id} trade={trade} poolInfo={props.poolInfo} />
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ));
}
