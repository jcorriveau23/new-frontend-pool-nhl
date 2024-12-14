"use client";

import * as React from "react";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";

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
import { useRouter } from "@/i18n/routing";
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
  linkTo: string | null;
}

export function Combobox(props: Props) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(props.defaultSelectedValue);
  const router = useRouter();
  const t = useTranslations();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value
            ? props.selections.find((s) => s.value === value)?.label
            : props.emptyText}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
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
                    props.linkTo
                      ? router.push(
                          `${props.linkTo.replace("${value}", newValue)}`
                        )
                      : setValue(newValue === value ? "" : newValue);
                    setOpen(false);
                  }}
                >
                  {s.label}
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === s.value ? "opacity-100" : "opacity-0"
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
