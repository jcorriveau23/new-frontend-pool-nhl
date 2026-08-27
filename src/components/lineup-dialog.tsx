"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import StartingRoster from "@/components/starting-roster";

type RosterProps = Omit<
  React.ComponentProps<typeof StartingRoster>,
  "onDirtyChange"
>;

// The imperative handle the dialog exposes, used to close it once the pooler
// has confirmed they are giving up their edits.
type DialogActions = NonNullable<
  React.ComponentProps<typeof Dialog>["actionsRef"]
>["current"];

interface Props {
  // Used both as the trigger label and as the dialog title.
  title: string;
  // The element the trigger renders as, and what goes inside it.
  triggerRender: React.ReactElement<Record<string, unknown>>;
  triggerContent: React.ReactNode;
  roster: RosterProps;
}

/*
Hosts the lineup editor in a dialog and refuses to throw away unsaved moves
without asking. Escape, a click on the backdrop and the close button all go
through `onOpenChange`, so cancelling there covers every way out; the dialog
stays uncontrolled otherwise, since the pooler selector inside it swaps the
participant and a remount would close it.
*/
export default function LineupDialog({
  title,
  triggerRender,
  triggerContent,
  roster,
}: Props) {
  const t = useTranslations();
  const [isConfirmingClose, setIsConfirmingClose] = React.useState(false);
  const dialogActions = React.useRef<DialogActions>(null);
  // A ref rather than state: `onOpenChange` and the confirmation both read it
  // during an event, and `close()` below runs before a state update would have
  // landed -- a stale `true` there would cancel the very close it was asked
  // for. Nothing renders from it, so there is nothing to re-render for.
  const isDirty = React.useRef(false);

  // Stable identity, otherwise the effect reporting it in the lineup would
  // re-run on every render of this component.
  const handleDirtyChange = React.useCallback((dirty: boolean) => {
    isDirty.current = dirty;
  }, []);

  const discardAndClose = () => {
    isDirty.current = false;
    setIsConfirmingClose(false);
    dialogActions.current?.close();
  };

  return (
    <>
      <Dialog
        actionsRef={dialogActions}
        onOpenChange={(open, eventDetails) => {
          if (open) {
            return;
          }
          if (isDirty.current) {
            eventDetails.cancel();
            setIsConfirmingClose(true);
            return;
          }
          isDirty.current = false;
        }}
      >
        <DialogTrigger render={triggerRender}>{triggerContent}</DialogTrigger>
        <DialogContent className="flex h-full max-h-[92%] w-full max-w-5xl flex-col gap-3 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="min-h-0 flex-1">
            <StartingRoster {...roster} onDirtyChange={handleDirtyChange} />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isConfirmingClose}
        onOpenChange={setIsConfirmingClose}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("DiscardLineupChangesTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("DiscardLineupChangesDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("KeepEditing")}</AlertDialogCancel>
            <AlertDialogAction onClick={discardAndClose}>
              {t("DiscardChanges")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
