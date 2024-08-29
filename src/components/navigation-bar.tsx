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
} from "./ui/sheet";
import {
  UserCircle,
  HomeIcon,
  TrophyIcon,
  LucideHome,
  Loader2,
} from "lucide-react";
import { LanguageSelector } from "./language-selector";
import { Link } from "@/navigation";
import { LAST_NHL_SEASON } from "@/lib/nhl";
import { UserManager } from "./user-manager";
import { getTranslations } from "next-intl/server";

export default async function NavigationBar({
  params,
}: {
  params: { selectedDate: string };
}) {
  const t = await getTranslations();
  return (
    <>
      <div className="m-2 grid gap-2 grid-cols-2">
        <div className="flex items-center gap-1">
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
                <div className="mt-5 space-y-2">
                  <Link
                    href="/"
                    className="flex items-center gap-2 hover:bg-secondary p-1"
                  >
                    <HomeIcon />
                    {t("Home")}
                  </Link>
                  <Link
                    href={`/${params.selectedDate}/pools/20242025`}
                    className="flex items-center gap-2 hover:bg-secondary p-1"
                  >
                    {t("PoolList")}
                  </Link>
                  <Link
                    href={`/${params.selectedDate}/create-pool`}
                    className="flex items-center gap-2 hover:bg-secondary p-1"
                  >
                    {t("CreatePool")}
                  </Link>
                </div>
              </SheetDescription>
              <SheetHeader>
                <SheetTitle>{t("NhlStatsPages")}</SheetTitle>
              </SheetHeader>
              <SheetDescription>
                <div className="mt-5 space-y-2">
                  <Link
                    href={`/${params.selectedDate}/standing/now`}
                    className="flex items-center gap-2 hover:bg-secondary p-1"
                  >
                    {t("Standing")}
                  </Link>
                  <Link
                    href={`/${params.selectedDate}/draft/2024`}
                    className="flex items-center gap-2 hover:bg-secondary p-1"
                  >
                    {t("Draft")}
                  </Link>
                  <Link
                    href={`/${params.selectedDate}/roster/${LAST_NHL_SEASON}${
                      LAST_NHL_SEASON + 1
                    }`}
                    className="flex items-center gap-2 hover:bg-secondary p-1"
                  >
                    {t("Rosters")}
                  </Link>
                </div>
              </SheetDescription>
            </SheetContent>
          </Sheet>
          {/* <Input type="search" placeholder="Search..." /> */}
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
