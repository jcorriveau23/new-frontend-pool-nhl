"use client";

import React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface InformationIconProps {
  text: React.ReactNode;
  className?: string;
}

const InformationIcon: React.FC<InformationIconProps> = ({
  text,
  className,
}) => {
  const t = useTranslations();

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={200}
        aria-label={t("MoreInformation")}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          className
        )}
      >
        <InfoIcon aria-hidden="true" className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto max-w-72 px-3 py-2 text-sm">
        {text}
      </PopoverContent>
    </Popover>
  );
};

export default InformationIcon;
