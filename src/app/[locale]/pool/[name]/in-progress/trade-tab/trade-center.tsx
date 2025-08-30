import PoolerRoster from "@/components/pooler-roster";
import {
  DraftPick,
  getPoolerActivePlayers,
  getPoolerAllPlayers,
  Player,
  PoolUser,
  TradeItems,
  TradeStatus,
} from "@/data/pool/model";
import { Dispatch, SetStateAction, useState, useTransition } from "react";
import { usePoolContext } from "@/context/pool-context";
import { TradeItem, TradeSide } from "@/components/trade";
import PickList from "@/components/pick-list";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import SelectTradeItems from "@/components/select-trade-items";
import { useTranslations } from "next-intl";

export default function TradeCenter() {
  const [userFromTrade, setUserFromTrade] = useState<PoolUser | null>(null);
  const [userToTrade, setUserToTrade] = useState<PoolUser | null>(null);
  const { poolInfo } = usePoolContext();
  const [fromRosterDialogOpen, setFromRosterDialogOpen] = useState(false);
  const [toRosterDialogOpen, setToRosterDialogOpen] = useState(false);
  const t = useTranslations();

  const [fromItems, setFromItems] = useState<TradeItems>({
    players: [],
    picks: [],
  });
  const [toItems, setToItems] = useState<TradeItems>({
    players: [],
    picks: [],
  });

  function onTradeItemsSelected(tradeItems: TradeItems, poolUser: PoolUser) {
    // Validate if the player can be added to the trade.
    if (tradeItems.players.length > 5) return;

    // 5 players maximum per side for a trade.
    if (tradeItems.picks.length > 3) return;

    if (poolUser.id === userFromTrade?.id) {
      setFromItems(tradeItems);
      return;
    }

    if (poolUser.id === userToTrade?.id) {
      setToItems(tradeItems);
      return;
    }
  }

  function onEditFromPlayerSelection() {
    // Pops a dialog to update the trade players and pick selected.
    console.log("yopyoyo");
    setFromRosterDialogOpen(true);
  }
  function onClearFromPlayerSelection() {
    setFromItems({
      players: [],
      picks: [],
    });
  }

  function onEditToPlayerSelection() {
    // Pops a dialog to update the trade players and pick selected.
    setToRosterDialogOpen(true);
  }
  function onClearToPlayerSelection() {
    setToItems({
      players: [],
      picks: [],
    });
  }

  function setFromPoolUser(user: PoolUser) {
    // Validate if the pool user selected exist?
    // delete all previous From trade items.
    if (user.id === userFromTrade?.id) return;

    if (user.id === userToTrade?.id) return;

    setUserFromTrade(user);
    setFromItems({
      players: [],
      picks: [],
    });
  }

  function setToPoolUser(user: PoolUser) {
    // Validate if the pool user selected exist?
    // delete all previous To trade items.
    if (user.id === userToTrade?.id) return;
    if (user.id === userFromTrade?.id) return;

    setUserToTrade(user);
    setToItems({
      players: [],
      picks: [],
    });
  }

  function SelectTradeItemsDialog(
    user: PoolUser | null,
    tradeItems: TradeItems,
    open: boolean,
    onOpenChange: Dispatch<SetStateAction<boolean>>
  ) {
    if (!user) return;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-full max-h-[96%] p-4 w-full max-w-[96%]">
          <DialogHeader>
            <DialogTitle>TODO</DialogTitle>
          </DialogHeader>
          <ScrollArea className="p-0">
            <SelectTradeItems
              defaultTradeItems={tradeItems}
              userRoster={getPoolerActivePlayers(poolInfo.context!, user)}
              onTradeItemsSelected={onTradeItemsSelected}
            />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <TradeItem
        trade={{
          proposed_by: "",
          ask_to: "",
          from_items: fromItems,
          to_items: toItems,
          status: TradeStatus.NEW,
          id: 0,
          date_created: 0,
          date_accepted: 0,
        }}
        poolInfo={poolInfo}
        editTrade={{
          setFromPoolUser: setFromPoolUser,
          onEditFromPlayerSelection: onEditFromPlayerSelection,
          onClearFromPlayerSelection: onClearFromPlayerSelection,
          setToPoolUser: setToPoolUser,
          onEditToPlayerSelection: onEditToPlayerSelection,
          onClearToPlayerSelection: onClearToPlayerSelection,
        }}
      />
      {SelectTradeItemsDialog(
        userFromTrade,
        fromItems,
        fromRosterDialogOpen,
        setFromRosterDialogOpen
      )}
      {SelectTradeItemsDialog(
        userToTrade,
        toItems,
        toRosterDialogOpen,
        setToRosterDialogOpen
      )}
    </>
  );
}
