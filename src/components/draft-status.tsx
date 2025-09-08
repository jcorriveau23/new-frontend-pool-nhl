"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";

interface DraftStatusProps {
  round: number | null;
  pickNumber: number | null;
  currentDrafter: string | null;
  isUserTurn: boolean | null;
}

export default function DraftStatus({
  round,
  pickNumber,
  currentDrafter,
  isUserTurn,
}: DraftStatusProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations();

  const gradientClass = isUserTurn
    ? "bg-gradient-to-r from-green-500 to-emerald-600"
    : "bg-gradient-to-r from-blue-500 to-purple-600";

  return (
    <div className="w-full max-w-sm mx-auto mt-4">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant={isUserTurn ? "default" : "outline"}
        className={`w-full justify-between ${
          isUserTurn ? "bg-green-600 hover:bg-green-700" : ""
        }`}
      >
        {isUserTurn
          ? t("DraftStatusYourTurn")
          : t("DraftStatus", { user: currentDrafter ?? "" })}
        {isOpen ? (
          <ChevronUp className="h-4 w-4 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-2" />
        )}
      </Button>
      {isOpen && (
        <Card className={`mt-2 ${gradientClass}`}>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-white">
                <span className="font-semibold">
                  {t("RoundAndPick", {
                    roundNumber: round ?? 0,
                    pickNumber: pickNumber ?? 0,
                  })}
                </span>
              </p>
              <p className="text-sm text-white mt-1">
                <span className="font-semibold">
                  {t("CurrentTurn", { user: currentDrafter ?? "" })}
                </span>
              </p>
              {isUserTurn && (
                <p className="text-sm text-white mt-2 font-bold">
                  {t("YourTurnToDraft")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
