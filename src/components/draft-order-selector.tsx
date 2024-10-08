"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function DraftOrderSelector() {
  const { roomUsers, sendSocketCommand } = useSocketContext();
  const userIds = Object.keys(roomUsers ?? {});

  const t = useTranslations();

  const positions = userIds.length;

  const [draftOrder, setDraftOrder] = useState<string[]>(
    Array(positions).fill("")
  );

  const handleSelectionChange = (position: number, user: string) => {
    setDraftOrder((prevOrder) => {
      const newOrder = [...prevOrder];
      newOrder[position] = user;
      return newOrder;
    });
  };

  const generateRandomOrder = () => {
    const shuffled = [...userIds].sort(() => 0.5 - Math.random());
    setDraftOrder(shuffled);
  };

  const startDraft = () => {
    sendSocketCommand(
      Command.StartDraft,
      `{"draft_order": ${JSON.stringify(draftOrder)}}`
    );
  };

  const areAllUsersReady = (users: Record<string, RoomUser>) =>
    // The draft is ready to start if all poolers are ready and the
    // number of poolers match the number of poolers in the settings.
    Object.values(users).every((user) => user.is_ready);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          {t("DraftOrderSelector")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={generateRandomOrder} className="mb-6">
          <Dice2Icon />
          {t("RandomOrder")}
        </Button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: positions }, (_, positionIndex) => (
            <div key={positionIndex} className="flex flex-col space-y-1">
              <span className="text-sm font-medium">
                Position {positionIndex + 1}:
              </span>
              <Select
                value={draftOrder[positionIndex]}
                onValueChange={(value) =>
                  handleSelectionChange(positionIndex, value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a user" />
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
        <Button
          onClick={() => startDraft()}
          disabled={!areAllUsersReady(roomUsers ?? {})}
        >
          {t("StartDraft")}
        </Button>
      </CardContent>
    </Card>
  );
}
