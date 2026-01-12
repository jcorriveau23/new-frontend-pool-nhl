"use client";

import * as React from "react";
import { Check, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
// Define the cn function inline
const cn = (...classes: (string | undefined)[]) =>
  classes.filter(Boolean).join(" ");

export default function LanguageSelector() {
  // translations states
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChangeLanguage = (language: "en" | "fr") => {
    router.replace(pathname, { locale: language });
  };
  const [open, setOpen] = React.useState(false);

  const languages = [
    { value: "en", label: "English" },
    { value: "fr", label: "French" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open}>
          <Globe className="mr-2 h-4 w-4 shrink-0" />
          {t(
            languages.find((language) => language.value === locale)?.label ?? ""
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[150px] p-0">
        <Command>
          <CommandGroup>
            {languages.map((language) => (
              <CommandItem
                key={language.value}
                value={language.value}
                onSelect={(currentValue) => {
                  handleChangeLanguage(currentValue as "en" | "fr");
                  setOpen(false);
                }}
              >
                {t(language.label)}
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    locale === language.value ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
