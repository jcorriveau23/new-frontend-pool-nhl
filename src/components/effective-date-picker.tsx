/*
The day a roster move counts from.

A move is normally filed for today, and the day it was filed is the only day it
could sensibly mean. A correction is the exception: a player drafted by mistake,
a waiver claim that should have gone through a week ago, a lineup that was wrong
from opening night. Those have to count from the day they should have counted
from, or the days in between go on being scored with the roster the correction
was meant to replace.

Rendered by every screen that files such a move — the lineup dialog, the roster
tables, the waiver search — so they cannot drift apart on which days may be
picked. Showing it at all is the caller's call: backdating rewrites days already
scored, which is the owner's and the assistants' to do.
*/
"use client";

import * as React from "react";
import { format as formatDate } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BackdateRange } from "@/lib/roster-modification";

interface Props {
  range: BackdateRange;
  // The picked day as "YYYY-MM-DD", which is what the endpoints take.
  value: string;
  onChange: (date: string) => void;
  // Locks the picker while the move it belongs to is in flight.
  disabled?: boolean;
}

// The pickers live inside dialogs, where a date is a local day rather than an
// instant: parsing at midnight local time keeps the day the user clicked.
const toDate = (dateKey: string): Date => new Date(`${dateKey}T00:00:00`);

export default function EffectiveDatePicker(props: Props) {
  const t = useTranslations();

  // Nothing to pick: the move can only count from the one day the pool has
  // scored so far, which is what it would do anyway.
  if (!props.range.canBackdate) {
    return null;
  }

  const selected = toDate(props.value);
  const isBackdated = props.value !== props.range.defaultDate;

  return (
    <div className="space-y-2">
      <Label>{t("MoveEffectiveDate")}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                disabled={props.disabled}
                className="w-[220px] justify-start text-left font-normal"
              />
            }
          >
            <CalendarIcon className="mr-2 size-4 shrink-0" />
            {formatDate(selected, "PPP")}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected}
              onSelect={(date) =>
                date && props.onChange(formatDate(date, "yyyy-MM-dd"))
              }
              // The season start is the earliest day a lineup can apply to, and
              // today the latest: a move dated forward would score a lineup the
              // roster no longer backs.
              disabled={{
                before: toDate(props.range.earliestDate),
                after: toDate(props.range.latestDate),
              }}
              className="rounded-md border shadow-sm"
              required
            />
          </PopoverContent>
        </Popover>
        {isBackdated ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={props.disabled}
            onClick={() => props.onChange(props.range.defaultDate)}
          >
            {t("MoveEffectiveDateToday")}
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {isBackdated
          ? t("MoveEffectiveDateBackdatedHint")
          : t("MoveEffectiveDateHint")}
      </p>
    </div>
  );
}
