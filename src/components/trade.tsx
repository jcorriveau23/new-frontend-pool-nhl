import * as React from "react";
import {
  DraftPick,
  Pool,
  PoolUser,
  Trade,
  TradeItems,
} from "@/data/pool/model";
import { Badge } from "./ui/badge";
import { ordinal } from "@/app/utils/formating";
import { usePoolContext } from "@/context/pool-context";
import { PoolerUserSelector } from "./pool-user-selector";

import { EditIcon, XSquareIcon } from "lucide-react";
import { Button } from "./ui/button";

export enum TradeSide {
  FROM = 0,
  TO = 1,
}

interface EditTrade {
  setFromPoolUser: (poolUser: PoolUser) => void;
  onEditFromPlayerSelection: () => void;
  onClearFromPlayerSelection: () => void;
  setToPoolUser: (poolUser: PoolUser) => void;
  onEditToPlayerSelection: () => void;
  onClearToPlayerSelection: () => void;
}

interface Props {
  trade: Trade;
  poolInfo: Pool;
  editTrade?: EditTrade | null;
}

export function TradeItem(props: Props) {
  const { dictUsers } = usePoolContext();

  const TradedPicks = (picks: DraftPick[]) =>
    picks.map((p) => (
      <Badge key={`${p.from}${p.round}`} variant="secondary">
        {ordinal(p.round + 1)} {`(${dictUsers[p.from].name})`}
      </Badge>
    ));

  const Side = (tradeItems: TradeItems) => (
    <>
      <div className="m-2">
        {tradeItems.players.map((playerId) => (
          <Badge key={playerId}>
            {props.poolInfo.context?.players[playerId].name}
          </Badge>
        ))}
        {tradeItems.picks.length > 0 ? TradedPicks(tradeItems.picks) : null}
      </div>
    </>
  );

  return (
    <div className="border">
      <div className="flex p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <div>
            <div className="flex">
              <h3 className="text-lg font-semibold">
                {props.editTrade ? (
                  <PoolerUserSelector
                    setSelectedUser={props.editTrade.setToPoolUser}
                    defaultUserSelection={dictUsers[props.trade.ask_to]?.name}
                  />
                ) : (
                  dictUsers[props.trade.ask_to]?.name
                )}
              </h3>
              {props.editTrade ? (
                <>
                  <Button
                    onClick={() => props.editTrade?.onEditToPlayerSelection()}
                    variant="ghost"
                    size="icon"
                  >
                    <EditIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() =>
                      props.editTrade?.onClearToPlayerSelection?.()
                    }
                    variant="ghost"
                    size="icon"
                  >
                    <XSquareIcon className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </div>
            {Side(props.trade.to_items)}
          </div>
          <div className="border">
            <div className="flex">
              <h3 className="text-lg font-semibold">
                {props.editTrade ? (
                  <PoolerUserSelector
                    setSelectedUser={props.editTrade.setFromPoolUser}
                    defaultUserSelection={
                      dictUsers[props.trade.proposed_by]?.name
                    }
                  />
                ) : (
                  dictUsers[props.trade.proposed_by]?.name
                )}
              </h3>
              {props.editTrade ? (
                <>
                  <Button
                    onClick={() =>
                      props.editTrade?.onEditFromPlayerSelection?.()
                    }
                    variant="ghost"
                    size="icon"
                  >
                    <EditIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() =>
                      props.editTrade?.onClearFromPlayerSelection?.()
                    }
                    variant="ghost"
                    size="icon"
                  >
                    <XSquareIcon className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </div>
            {Side(props.trade.from_items)}
          </div>
        </div>
      </div>
    </div>
  );
}
