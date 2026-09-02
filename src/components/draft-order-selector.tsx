"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dice2Icon } from "lucide-react";
import { Command, useSocketContext } from "@/context/socket-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useTranslations } from "next-intl";
import { usePoolContext } from "@/context/pool-context";

export default function DraftOrderSelector() {
  const { roomUsers, sendSocketCommand } = useSocketContext();
  const { poolInfo } = usePoolContext();
  const userIds = useMemo(() => Object.keys(roomUsers ?? {}), [roomUsers]);

  const t = useTranslations();

  const positions = userIds.length;

  const [draftOrder, setDraftOrder] = useState<string[]>([]);

  useEffect(() => {
    setDraftOrder((prevOrder) => {
      const newOrder = Array.from({ length: userIds.length }, (_, position) =>
        userIds.includes(prevOrder[position]) ? prevOrder[position] : "",
      );

      return newOrder.length === prevOrder.length &&
        newOrder.every((user, position) => user === prevOrder[position])
        ? prevOrder
        : newOrder;
    });
  }, [userIds]);

  const handleSelectionChange = (position: number, user: string) => {
    setDraftOrder((prevOrder) => {
      const newOrder = [...prevOrder];
      newOrder[position] = user;
      return newOrder;
    });
  };

  const generateRandomOrder = () => {
    const shuffled = [...userIds];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setDraftOrder(shuffled);
  };

  const startDraft = () => {
    sendSocketCommand(
      Command.StartDraft,
      `{"draft_order": ${JSON.stringify(draftOrder)}}`,
    );
  };

  /*
  Which start condition is still unmet, phrased as something the pooler running
  the draft can act on — naming the poolers who have not readied up, or the
  positions still empty. One at a time and in this order, because the checks
  build on each other: the room has to hold the right people before the order
  over them means anything, and the order has to be sound before "everyone
  ready" is the only thing left. Returns null when the draft can start.
  */
  const startDraftBlocker = (): string | null => {
    const users = Object.values(roomUsers ?? {});
    const expected = poolInfo.settings.number_poolers;

    if (users.length < expected) {
      return t("StartDraftHintWaitingForPoolers", {
        count: expected - users.length,
        current: users.length,
        expected,
      });
    }

    if (users.length > expected) {
      return t("StartDraftHintTooManyPoolers", {
        current: users.length,
        expected,
      });
    }

    // A transient state: the effect above resizes the order to the room on the
    // next render. Guarded anyway so a mismatched order can never start a draft.
    if (draftOrder.length !== users.length) {
      return t("StartDraftHintEmptyPositions", {
        count: Math.abs(users.length - draftOrder.length),
      });
    }

    const unfilled = draftOrder.filter((user) => user === "").length;
    if (unfilled > 0) {
      return t("StartDraftHintEmptyPositions", { count: unfilled });
    }

    // Every pooler needs a spot of their own: the same pooler picked twice
    // would draft twice a round and leave another one out of the draft.
    const duplicated = [
      ...new Set(
        draftOrder.filter((user, position) => draftOrder.indexOf(user) !== position),
      ),
    ];
    if (duplicated.length > 0) {
      return t("StartDraftHintDuplicatePoolers", {
        count: duplicated.length,
        names: duplicated
          .map((user) => roomUsers?.[user]?.name ?? "")
          .join(", "),
      });
    }

    const notReady = users.filter((user) => !user.is_ready);
    if (notReady.length > 0) {
      return t("StartDraftHintNotReady", {
        count: notReady.length,
        names: notReady.map((user) => user.name).join(", "),
      });
    }

    return null;
  };

  const blocker = startDraftBlocker();
  const isReadyToStart = blocker === null;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-2xl font-bold">
          {t("DraftOrderSelector")}
        </CardTitle>
        <Button variant="outline" onClick={generateRandomOrder}>
          <Dice2Icon />
          {t("RandomOrder")}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: positions }, (_, positionIndex) => (
            <div key={positionIndex} className="flex flex-col space-y-1">
              <span className="text-sm font-medium">
                {t("Position")} {positionIndex + 1}
              </span>
              <Select
                value={draftOrder[positionIndex] ?? ""}
                items={userIds.map((user) => ({
                  value: user,
                  label: roomUsers?.[user]?.name ?? "",
                }))}
                onValueChange={(value) =>
                  handleSelectionChange(positionIndex, value as string)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("SelectUser")} />
                </SelectTrigger>
                <SelectContent>
                  {userIds.map((user) => (
                    <SelectItem key={user} value={user}>
                      {roomUsers?.[user]?.name ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2">
        <Button onClick={() => startDraft()} disabled={!isReadyToStart}>
          {t("StartDraft")}
        </Button>
        {blocker !== null ? (
          <p
            className="text-center text-sm text-muted-foreground"
            // The button it explains is disabled, so nothing here takes focus:
            // announce the reason instead of leaving it to be stumbled upon.
            role="status"
          >
            {blocker}
          </p>
        ) : null}
      </CardFooter>
    </Card>
  );
}
