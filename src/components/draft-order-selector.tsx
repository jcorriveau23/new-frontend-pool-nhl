"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSocketContext } from "@/context/socket-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export default function DraftOrderSelector() {
  const { roomUsers } = useSocketContext();
  const userIds = Object.keys(roomUsers ?? {});

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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Fantasy Draft Order Selection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={generateRandomOrder} className="mb-6">
          Generate Random Order
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
      </CardContent>
    </Card>
  );
}
