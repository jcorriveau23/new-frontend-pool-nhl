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
    <div className="flex flex-col gap-2">
      <Label htmlFor="pooler-selector" className="text-sm font-medium">
        {t("PoolerOfInterest")}
      </Label>
      <Select
        value={selectedParticipant}
        onValueChange={(userName) => {
          if (userName !== null) updateSelectedParticipant(userName);
        }}
      >
        <SelectTrigger className="w-full" id="pooler-selector">
          <SelectValue placeholder={t("SelectPoolerOfInterest")} />
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
