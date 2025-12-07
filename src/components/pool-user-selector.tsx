"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { PoolUser } from "@/data/pool/model";
import { usePoolContext } from "@/context/pool-context";
import { Label } from "./ui/label";
import { useTranslations } from "next-intl";

export function PoolerUserGlobalSelector() {
  const { poolInfo, selectedParticipant, updateSelectedParticipant } =
    usePoolContext();
  const t = useTranslations();
  return (
    <div className="space-y-2">
      <Label htmlFor="pooler-selector" className="text-sm font-medium">
        {t("PoolerOfInterest")}
      </Label>
      <Select
        value={selectedParticipant}
        onValueChange={(userName) => updateSelectedParticipant(userName)}
      >
        <SelectTrigger className="w-full" id="pooler-selector">
          <SelectValue placeholder="Select pooler of interest" />
        </SelectTrigger>
        <SelectContent>
          {poolInfo.participants?.map((user: PoolUser) => (
            <SelectItem key={user.id} value={user.name}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
