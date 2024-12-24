"use client";
import React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";

interface DraftedPlayerIconProps {
  playerName: string;
  userName: string;
  onIconClick?: (e: React.MouseEvent) => void;
}

export default function DraftedPlayerIcon({
  playerName,
  userName,
  onIconClick,
}: DraftedPlayerIconProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const t = useTranslations();

  const handleIconClick = (e: React.MouseEvent) => {
    setIsOpen(!isOpen);
    if (onIconClick) {
      onIconClick(e);
    }
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Shield
            className="cursor-pointer h-4 w-4 text-red-500 ml-2"
            onClick={handleIconClick}
          />
        </PopoverTrigger>
        <PopoverContent align="start">
          {t("PlayerDraftedBy", {
            playerName: playerName,
            userName: userName,
          })}
        </PopoverContent>
      </Popover>
    </>
  );
}
