import * as React from "react";
import { CalendarIcon } from "lucide-react";
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

// date-fns localized patterns (P, PP, ...) always include the year and the
// word order differs between languages, so short formats are defined per locale.
const dateFormatMap = {
  en: { short: "EEE, MMM d", long: "EEE, MMM d, yyyy" },
  fr: { short: "EEE d MMM", long: "EEE d MMM yyyy" },
};

interface DatePickerProps {
  currentDate: Date;
  selectedDate: Date | null;
  // Date to display when the user has not explicitly selected one
  // (e.g. the current date returned by the NHL score api).
  fallbackDate?: Date | null;
  updateDate: (newDate: Date | null) => void;
  updateDateWithString: (newDate: string) => void;
}

export function DatePicker(props: DatePickerProps) {
  const t = useTranslations();
  const locale = useLocale();

  const displayedDate = props.selectedDate ?? props.fallbackDate ?? null;
  const dateLocale = localeMap[locale as "en" | "fr"];
  const dateFormat = dateFormatMap[locale as "en" | "fr"];

  // The calendar opens on the month of the date being displayed instead of the
  // current month, and follows along when the date is changed from the outside
  // (prev/next buttons, url query).
  const [month, setMonth] = React.useState<Date>(
    displayedDate ?? props.currentDate
  );
  const displayedTime = displayedDate?.getTime();
  React.useEffect(() => {
    if (displayedTime !== undefined) {
      setMonth(new Date(displayedTime));
    }
  }, [displayedTime]);

  const isOffCurrentDate =
    props.selectedDate !== null &&
    props.selectedDate.toDateString() !== props.currentDate.toDateString();

  const handleSelectCurrentDate = (
    event: React.MouseEvent<SVGSVGElement, MouseEvent>
  ) => {
    event.stopPropagation(); // Prevents the click event from reaching the outer button+
    props.updateDate(null);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal",
              // Extra width when the warning icon is shown so the date stays fully visible.
              isOffCurrentDate
                ? "w-[168px] sm:w-[230px]"
                : "w-[144px] sm:w-[200px]",
              !displayedDate && "text-muted-foreground",
              isOffCurrentDate &&
                "border-amber-500/70 bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-400"
            )}
          />
        }
      >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {displayedDate ? (
            <>
              <span className="whitespace-nowrap sm:hidden">
                {format(displayedDate, dateFormat.short, { locale: dateLocale })}
              </span>
              <span className="hidden whitespace-nowrap sm:inline">
                {format(displayedDate, dateFormat.long, { locale: dateLocale })}
              </span>
            </>
          ) : (
            <span>{t("PickDate")}</span>
          )}
          {isOffCurrentDate && (
            <div className="ml-auto pl-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <AlertTriangle
                        className="size-4 shrink-0 text-amber-500"
                        onClick={handleSelectCurrentDate}
                      />
                    }
                  />
                  <TooltipContent>
                    <p>{t("NotCurrentDateSelected")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={displayedDate ?? props.currentDate}
          month={month}
          onMonthChange={setMonth}
          onSelect={props.updateDate}
          className="rounded-md border shadow-sm"
          required
        />
      </PopoverContent>
    </Popover>
  );
}
