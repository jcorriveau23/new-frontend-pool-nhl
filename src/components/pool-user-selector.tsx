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

export interface PoolerSelectorEntry {
  id: string;
  name: string;
  // Standing of the pooler, when the caller knows it.
  rank?: number;
  points?: number;
}

interface PoolerUserGlobalSelectorProps {
  // Poolers in the order they should be listed. Defaults to the pool
  // registration order.
  entries?: PoolerSelectorEntry[];
}

export function PoolerUserGlobalSelector({
  entries,
}: PoolerUserGlobalSelectorProps = {}) {
  const { poolInfo, selectedParticipant, updateSelectedParticipant } =
    usePoolContext();
  const t = useTranslations();

  const poolers: PoolerSelectorEntry[] =
    entries ??
    (poolInfo.participants ?? []).map((user: PoolUser) => ({
      id: user.id,
      name: user.name,
    }));

  return (
    <div className="flex flex-col gap-1.5">
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
          {poolers.map((pooler) => (
            <SelectItem
              key={pooler.id}
              value={pooler.name}
              leading={
                pooler.rank !== undefined ? (
                  <span className="mr-2 w-6 shrink-0 tabular-nums text-muted-foreground">
                    #{pooler.rank}
                  </span>
                ) : null
              }
              trailing={
                pooler.points !== undefined ? (
                  <span className="ml-auto pl-4 tabular-nums text-muted-foreground">
                    {pooler.points} PTS
                  </span>
                ) : null
              }
            >
              {pooler.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
