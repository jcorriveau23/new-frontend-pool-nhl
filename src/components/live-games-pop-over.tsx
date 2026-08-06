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
      <PopoverTrigger
        nativeButton={false}
        render={<span className="relative flex size-2" />}
      >
        <span className="bg-destructive absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
        <span className="bg-destructive relative inline-flex size-2 rounded-full"></span>
      </PopoverTrigger>
      <PopoverContent className="w-48">
        <div className="flex items-center gap-2">
          <span className="bg-destructive inline-flex size-2 animate-pulse rounded-full" />
          <p className="text-sm font-medium">{t("LiveGame")}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
