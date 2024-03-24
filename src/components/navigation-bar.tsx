"use client";
import * as React from "react";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { Button } from "./ui/button";
import { ModeToggle } from "./theme-toggle";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
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

export function NavigationBar() {
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
                <SheetTitle>{t("Menu")}</SheetTitle>
              </SheetHeader>
              <SheetDescription>
                <div className="p-2">
                  <SheetClose asChild>
                    <Link href="/pools">{t("Pool List")}</Link>
                  </SheetClose>
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
          </div>
        </div>
      </div>
      <Separator />
    </>
  );
}
