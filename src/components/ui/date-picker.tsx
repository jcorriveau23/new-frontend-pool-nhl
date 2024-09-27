import * as React from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useLocale, useTranslations } from "next-intl";
import { enUS, fr } from "date-fns/locale";

const localeMap = {
  en: enUS,
  fr: fr,
};

interface Props {
  currentDate: Date;
  selectedDate: Date | null;
  updateDate: (newDate: Date) => void;
  updateDateWithString: (newDate: string) => void;
}

export function DatePicker(props: Props) {
  const t = useTranslations();
  const locale = useLocale();

  const handleSelectCurrentDate = (
    event: React.MouseEvent<SVGSVGElement, MouseEvent>
  ) => {
    event.stopPropagation(); // Prevents the click event from reaching the outer button+
    props.updateDate(props.currentDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !props.selectedDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {props.selectedDate ? (
            format(props.selectedDate, "PPPP", {
              locale: localeMap[locale as "en" | "fr"],
            })
          ) : (
            <span>{t("Pick a date")}</span>
          )}
          {props.selectedDate === null ||
          props.selectedDate.toDateString() ===
            props.currentDate.toDateString() ? null : (
            <div className="ml-auto">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle
                      onClick={handleSelectCurrentDate}
                    ></AlertTriangle>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("Not current date selected")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={props.selectedDate ?? props.currentDate}
          // @ts-ignore
          onSelect={props.updateDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
