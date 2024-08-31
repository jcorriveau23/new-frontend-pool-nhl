"use client";
import * as React from "react";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { Button } from "./ui/button";
import { ModeToggle } from "./theme-toggle";
import { Input } from "./ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "./ui/sheet";

import { useTranslations } from "next-intl";
import { LanguageSelector } from "./language-selector";
import { Link } from "@/navigation";
import { LAST_NHL_SEASON } from "@/lib/nhl";
import { UserManager } from "./user-manager";
import { useSearchParams } from "next/navigation";

export function NavigationBar() {
  const searchParams = useSearchParams();
  const t = useTranslations();
  return (
    <>
      <div className="m-2 grid gap-2 grid-cols-2">
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <HamburgerMenuIcon className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>{t("MainPages")}</SheetTitle>
              </SheetHeader>
              <SheetDescription>
                <div className="p-2 space-y-3">
                  <div className="hover:underline">
                    <SheetClose asChild>
                      <Link href={`/?${searchParams}`}>{t("Home")}</Link>
                    </SheetClose>
                  </div>
                  <div className="hover:underline">
                    <SheetClose asChild>
                      <Link href={`/pools/20242025?${searchParams}`}>
                        {t("PoolList")}
                      </Link>
                    </SheetClose>
                  </div>
                  <div className="hover:underline">
                    <SheetClose asChild>
                      <Link href={`/create-pool?${searchParams}`}>
                        {t("CreatePool")}
                      </Link>
                    </SheetClose>
                  </div>
                </div>
              </SheetDescription>
              <SheetHeader>
                <SheetTitle>{t("NhlStatsPages")}</SheetTitle>
              </SheetHeader>
              <SheetDescription>
                <div className="p-2 space-y-3">
                  <div className="hover:underline">
                    <SheetClose asChild>
                      <Link href={`/standing/now?${searchParams}`}>
                        {t("Standing")}
                      </Link>
                    </SheetClose>
                  </div>
                  <div className="hover:underline">
                    <SheetClose asChild>
                      <Link href={`/draft/2024?${searchParams}`}>
                        {t("Draft")}
                      </Link>
                    </SheetClose>
                  </div>

                  <div className="hover:underline">
                    <SheetClose asChild>
                      <Link
                        href={`/roster/${LAST_NHL_SEASON}${
                          LAST_NHL_SEASON + 1
                        }?${searchParams}`}
                      >
                        {t("Rosters")}
                      </Link>
                    </SheetClose>
                  </div>
                </div>
              </SheetDescription>
            </SheetContent>
          </Sheet>
          <Input type="search" placeholder="Search..." />
        </div>
        <div>
          <div className="float-right">
            <LanguageSelector />
            <ModeToggle />
            <UserManager />
          </div>
        </div>
      </div>
    </>
  );
}
