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

import { DateContextProps } from "@/context/date-context";
import { useTranslations } from "next-intl";

export function DatePicker(props: DateContextProps) {
  const t = useTranslations();

  const handleSelectCurrentDate = (
    event: React.MouseEvent<SVGSVGElement, MouseEvent>
  ) => {
    event.stopPropagation(); // Prevents the click event from reaching the outer button+
    props.updateDate(new Date());
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
            props.selectedDate
          ) : (
            <span>{t("Pick a date")}</span>
          )}
          {props.selectedDate === "now" ? null : (
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
          selected={new Date(props.selectedDate)}
          // @ts-ignore
          onSelect={props.updateDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
