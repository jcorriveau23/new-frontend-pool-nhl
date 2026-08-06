"use client";

import * as React from "react";
import { ChevronsUpDownIcon, CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslations } from "next-intl";

export interface Selection {
  value: string;
  label: string;
}

export interface Props {
  selections: Selection[];
  defaultSelectedValue: string;
  emptyText: string;
  onSelect: (newValue: string) => void;
}

export function Combobox(props: Props) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(props.defaultSelectedValue);
  const t = useTranslations();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
          />
        }
      >
        {value
          ? props.selections.find(
              (s) => s.value.toLowerCase() === value.toLowerCase()
            )?.label
          : props.emptyText}
        <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <ScrollArea className="h-96">
            <CommandEmpty>{t("NoData")}</CommandEmpty>
            <CommandGroup>
              {props.selections.map((s) => (
                <CommandItem
                  key={s.value}
                  value={s.value}
                  onSelect={(newValue) => {
                    const newSelection = newValue === value ? "" : newValue;
                    setValue(newSelection);
                    props.onSelect(newSelection);
                    setOpen(false);
                  }}
                >
                  {s.label}
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === s.value.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
