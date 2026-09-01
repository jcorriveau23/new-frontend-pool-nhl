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
import { Command, RoomUser, useSocketContext } from "@/context/socket-context";
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

  const areAllUsersReady = (users: Record<string, RoomUser>) =>
    // The draft is ready to start if all poolers are ready and the
    // number of poolers match the number of poolers in the settings.
    Object.values(users).every((user) => user.is_ready) &&
    Object.keys(users).length === poolInfo.settings.number_poolers &&
    Object.keys(users).length === draftOrder.length &&
    // Every pooler needs a spot of their own: the same pooler picked twice
    // would draft twice a round and leave another one out of the draft.
    new Set(draftOrder).size === draftOrder.length &&
    draftOrder.every((user) => user !== "");

  const isReadyToStart = areAllUsersReady(roomUsers ?? {});

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
        {!isReadyToStart ? (
          <p className="text-center text-sm text-muted-foreground">
            {t("StartDraftHint")}
          </p>
        ) : null}
      </CardFooter>
    </Card>
  );
}
