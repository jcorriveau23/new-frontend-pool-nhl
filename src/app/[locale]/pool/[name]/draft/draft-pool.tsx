"use client";
// Draft Pool Status displaying the list of available players to draft
// alongside the order of the draft and the current drafter. This state will
// be active until all players has finished drafting all their players (Automatically changed to in progress when done).

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Draft from "@/components/draft";
import PlayersTable from "@/components/player-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getPoolerActivePlayers, Player } from "@/data/pool/model";
import { usePoolContext } from "@/context/pool-context";
import { useTranslations } from "next-intl";
import { Command, useSocketContext } from "@/context/socket-context";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import React from "react";
import UndoButton from "@/components/undo-button";
import LineupDialog from "@/components/lineup-dialog";
import { useUser } from "@/context/useUserData";

export default function DraftPage() {
  const { poolInfo, selectedParticipant, playersOwner, protectedPlayers } =
    usePoolContext();
  const t = useTranslations();
  const { sendSocketCommand } = useSocketContext();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedPlayer, setSelectedPlayer] = React.useState<Player | null>(
    null
  );
  const userData = useUser();

  const onPlayerSelect = async (player: Player) => {
    // TODO: Add validation:
    // 1) is the user connected (socket connection valid is enough?)
    // 2) Is it really the user turn to draft?
    // 3) Is the player available ? not own by anyone ?
    // Note: that the backend already validate all of that but we could filter a lot of request by adding this validation on the backend as well.
    setSelectedPlayer(player);
    setDialogOpen(true);
    return true;
  };

  const confirmDraft = () => {
    if (selectedPlayer) {
      sendSocketCommand(
        Command.DraftPlayer,
        `{"player_id": ${selectedPlayer.id}}`
      );
      setDialogOpen(false); // Close the dialog
      setSelectedPlayer(null); // Clear the selected player
    }
  };

  const onUndoDraftPlayer = () => {
    sendSocketCommand(Command.UndoDraftPlayer, null);
  };

  const DraftPlayerAlertDialog = () => {
    return (
      <AlertDialog
        open={dialogOpen}
        onOpenChange={() => setDialogOpen(!dialogOpen)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("DraftAlertDialog", {
                playerName: selectedPlayer?.name ?? "",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("DraftAlertDialogQuestion", {
                playerName: selectedPlayer?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDraft}>
              {t("Continue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return (
    <div>
      <div className="flex flex-col mt-2 justify-center space-x-2 gap-2">
        <Dialog>
          <DialogTrigger render={<Button />}>
            {t("DraftAPlayer")}
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
                protectedPlayers={protectedPlayers}
                onPlayerSelect={onPlayerSelect}
              />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </DialogContent>
        </Dialog>
        <LineupDialog
          title={t("PoolersRoster")}
          triggerRender={<Button variant="outline" />}
          triggerContent={t("PoolersRoster")}
          roster={{
            userRoster: getPoolerActivePlayers(
              poolInfo.context!,
              poolInfo.participants.find(
                (user) => user.name === selectedParticipant
              ) ?? poolInfo.participants[0]
            ),
            teamSalaryCap: poolInfo.settings.salary_cap,
          }}
        />
        <UndoButton
          disabled={
            poolInfo.context?.players_name_drafted.length == 0 ||
            userData.info?.id !== poolInfo.owner
          }
          onClick={() => onUndoDraftPlayer()}
          label={t("Undo")}
        />
      </div>
      <Draft onPlayerSelect={onPlayerSelect} />
      {DraftPlayerAlertDialog()}
    </div>
  );
}
