"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { PoolUser } from "@/data/pool/model";
import { usePoolContext } from "@/context/pool-context";

export function PoolerUserSelector() {
  const { poolInfo, selectedParticipant, updateSelectedParticipant } =
    usePoolContext();
  return (
    <Select
      value={selectedParticipant}
      onValueChange={(userName) => updateSelectedParticipant(userName)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a user" />
      </SelectTrigger>
      <SelectContent>
        {poolInfo.participants?.map((user: PoolUser) => (
          <SelectItem key={user.id} value={user.name}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
