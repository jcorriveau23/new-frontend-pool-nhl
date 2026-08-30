"use client";

import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface DraftStatusProps {
  round: number | null;
  pickNumber: number | null;
  currentDrafter: string | null;
  isUserTurn: boolean | null;
  completedPicks: number;
  totalPicks: number;
}

export default function DraftStatus({
  round,
  pickNumber,
  currentDrafter,
  isUserTurn,
  completedPicks,
  totalPicks,
}: DraftStatusProps) {
  const t = useTranslations();

  // The draft is over once nobody is on the clock anymore.
  const isDraftDone = currentDrafter === null;
  const progress =
    totalPicks > 0 ? Math.min(100, (completedPicks / totalPicks) * 100) : 0;

  if (isDraftDone) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
        <CheckCircle2 className="size-5 shrink-0 text-success" />
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{t("DraftCompleted")}</p>
          <p className="text-sm text-muted-foreground">
            {t("DraftPicksMade", { pickCount: completedPicks })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card px-4 py-3",
        isUserTurn && "border-success/40 bg-success/10"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex size-2.5 shrink-0">
            <span
              className={cn(
                "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                isUserTurn ? "bg-success" : "bg-primary"
              )}
            />
            <span
              className={cn(
                "relative inline-flex size-2.5 rounded-full",
                isUserTurn ? "bg-success" : "bg-primary"
              )}
            />
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("RoundAndPick", {
                roundNumber: round ?? 0,
                pickNumber: pickNumber ?? 0,
              })}
            </p>
            <p
              // The drafter name lives inside the sentence, so the whole line
              // is what gets cut when the name runs long.
              title={currentDrafter ?? undefined}
              className={cn(
                "truncate font-semibold leading-tight",
                isUserTurn && "text-success"
              )}
            >
              {isUserTurn
                ? t("YourTurnToDraft")
                : t("CurrentTurn", { user: currentDrafter ?? "" })}
            </p>
          </div>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">
          {completedPicks} / {totalPicks}
        </p>
      </div>
      <Progress
        value={progress}
        className={cn("mt-3 h-1.5", isUserTurn && "bg-success/20")}
      />
    </div>
  );
}
