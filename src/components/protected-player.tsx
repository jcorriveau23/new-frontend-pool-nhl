"use client";
import React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";

interface ProtectedPlayerIconProps {
  playerName: string;
  userName: string;
  onIconClick?: (e: React.MouseEvent) => void;
}

export default function ProtectedPlayerIcon({
  playerName,
  userName,
  onIconClick,
}: ProtectedPlayerIconProps) {
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
        <PopoverTrigger
          nativeButton={false}
          render={
            <Shield
              className="cursor-pointer size-4 text-success ml-2"
              onClick={handleIconClick}
            />
          }
        />
        <PopoverContent align="start">
          {t("PlayerProtectedBy", {
            playerName: playerName,
            userName: userName,
          })}
        </PopoverContent>
      </Popover>
    </>
  );
}
