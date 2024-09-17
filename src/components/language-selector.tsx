"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { useRouter, usePathname } from "@/navigation";

export function LanguageSelector() {
  // translations states
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  const handleChangeLanguage = (language: "en" | "fr") => {
    router.replace(pathname, { locale: language });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Languages />
          <span className="sr-only">Toggle Language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleChangeLanguage("fr")}>
          {t("French")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleChangeLanguage("en")}>
          {t("English")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
