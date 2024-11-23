import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslations } from "next-intl";

export default function LiveGamePopOver() {
  const t = useTranslations();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-48 bg-red-50 border-red-100 text-red-800">
        <p className="text-sm font-medium">{t("LiveGame")}</p>
      </PopoverContent>
    </Popover>
  );
}
