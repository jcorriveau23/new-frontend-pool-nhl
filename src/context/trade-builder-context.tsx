/*
Module that mounts the trade dialog once for the whole pool, so any player row
or draft pick displayed in the pool can start a trade pre-filled with it.
*/
"use client";

import React, { createContext, useContext, ReactNode } from "react";

import CreateTradeDialog, {
  TradeAsset,
} from "@/components/create-trade-dialog";
import { DraftPick, Trade } from "@/data/pool/model";
import { usePoolContext } from "./pool-context";

export interface TradeBuilderContextProps {
  // Open the trade dialog, optionally on a given asset.
  openTradeBuilder: (asset?: TradeAsset | null) => void;
  // Open the trade dialog on a player, resolving its owner from the rosters.
  openTradeForPlayer: (playerId: number) => void;
  openTradeForPick: (pick: DraftPick, ownerId: string) => void;
  // Reopen an existing open trade to correct it. Owner and assistants only —
  // the dialog submits an update instead of filing a new trade.
  openTradeEditor: (trade: Trade) => void;
}

const TradeBuilderContext = createContext<TradeBuilderContextProps | undefined>(
  undefined,
);

export const useTradeBuilder = (): TradeBuilderContextProps => {
  const context = useContext(TradeBuilderContext);
  if (!context) {
    throw new Error(
      "useTradeBuilder must be used within a TradeBuilderProvider",
    );
  }
  return context;
};

export const TradeBuilderProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { poolInfo } = usePoolContext();
  const [open, setOpen] = React.useState(false);
  const [asset, setAsset] = React.useState<TradeAsset | null>(null);
  const [editing, setEditing] = React.useState<Trade | null>(null);

  const openTradeBuilder = React.useCallback(
    (tradeAsset?: TradeAsset | null) => {
      setAsset(tradeAsset ?? null);
      setEditing(null);
      setOpen(true);
    },
    [],
  );

  const openTradeEditor = React.useCallback((trade: Trade) => {
    setAsset(null);
    setEditing(trade);
    setOpen(true);
  }, []);

  const openTradeForPlayer = React.useCallback(
    (playerId: number) => {
      const rosters = poolInfo.context?.pooler_roster ?? {};
      const ownerId = Object.keys(rosters).find((poolerId) =>
        [
          ...rosters[poolerId].chosen_forwards,
          ...rosters[poolerId].chosen_defenders,
          ...rosters[poolerId].chosen_goalies,
          ...rosters[poolerId].chosen_reservists,
        ].includes(playerId),
      );

      if (!ownerId) {
        return;
      }
      openTradeBuilder({ poolerId: ownerId, playerId });
    },
    [poolInfo.context?.pooler_roster, openTradeBuilder],
  );

  const openTradeForPick = React.useCallback(
    (pick: DraftPick, ownerId: string) =>
      openTradeBuilder({ poolerId: ownerId, pick }),
    [openTradeBuilder],
  );

  return (
    <TradeBuilderContext.Provider
      value={{
        openTradeBuilder,
        openTradeForPlayer,
        openTradeForPick,
        openTradeEditor,
      }}
    >
      {children}
      <CreateTradeDialog
        open={open}
        onOpenChange={setOpen}
        initialAsset={asset}
        editingTrade={editing}
      />
    </TradeBuilderContext.Provider>
  );
};
