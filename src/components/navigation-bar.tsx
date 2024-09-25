"use client";
import * as React from "react";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "./ui/sheet";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/navigation";
import { LAST_NHL_SEASON } from "@/lib/nhl";
import { useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import LogoutButton from "./hanko/logout-button";
import {
  HomeIcon,
  Loader2,
  LucideHome,
  UserCircle,
  PencilIcon,
  Database,
  Trophy,
  School,
  Users,
} from "lucide-react";
import { useSession } from "@/context/useSessionData";
import { HankoUser, useUser } from "@/context/useUserData";
import LanguageSelector from "./language-selector";

export function NavigationBar() {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const router = useRouter();

  // User hooks to get user informationo.
  const userData = useUser();
  const userSession = useSession();

  const [userSheetOpen, setUserSheetOpen] = React.useState(false);
  const [menuSheetOpen, setMenuSheetOpen] = React.useState(false);

  const userAvatar = (userInfo: HankoUser) => (
    <Avatar className="cursor-pointer">
      <AvatarImage src="" />
      <AvatarFallback>{userInfo.email.substring(0, 1)}@</AvatarFallback>
    </Avatar>
  );

  const userMenu = (userInfo: HankoUser) => (
    <Sheet open={userSheetOpen} onOpenChange={setUserSheetOpen}>
      <SheetTrigger asChild>{userAvatar(userInfo)}</SheetTrigger>
      <SheetContent side="right">
        <SheetTitle>
          <div className="flex items-center gap-2">
            {userAvatar(userInfo)}
            <p>{userInfo.email}</p>
          </div>
        </SheetTitle>
        <SheetDescription>
          <div className="mt-5 space-y-2">
            <Link
              href="/profile"
              className="flex items-center gap-2 hover:bg-secondary p-1"
              onClick={() => setUserSheetOpen(false)}
            >
              <UserCircle />
              {t("YourProfile")}
            </Link>
          </div>
        </SheetDescription>
        <SheetFooter className="py-5">
          <div onClick={() => setUserSheetOpen(false)}>
            <LogoutButton />
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );

  const connectButton = () => (
    <Button variant="outline" onClick={() => router.push("/login")}>
      {t("Connect")}
    </Button>
  );

  return (
    <>
      <div className="m-2 grid gap-2 grid-cols-2">
        <div className="flex items-center gap-1">
          <Sheet open={menuSheetOpen} onOpenChange={setMenuSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <HamburgerMenuIcon className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Hockeypool</SheetTitle>
              </SheetHeader>
              <SheetDescription>
                <div className="mt-5 space-y-2">
                  <Link
                    href={`/?${searchParams}`}
                    className="flex items-center gap-2 hover:bg-secondary p-1"
                    onClick={() => setMenuSheetOpen(false)}
                  >
                    <HomeIcon />
                    {t("Home")}
                  </Link>
                  <Link
                    href={`/pools/20242025?${searchParams}`}
                    className="flex items-center gap-2 hover:bg-secondary p-1"
                    onClick={() => setMenuSheetOpen(false)}
                  >
                    <Database />
                    {t("PoolList")}
                  </Link>
                  <Link
                    href={`/create-pool?${searchParams}`}
                    className="flex items-center gap-2 hover:bg-secondary p-1"
                    onClick={() => setMenuSheetOpen(false)}
                  >
                    <PencilIcon />
                    {t("CreatePool")}
                  </Link>
                </div>
              </SheetDescription>
              <SheetHeader className="mt-5">
                <SheetTitle>{t("NhlStatsPages")}</SheetTitle>
              </SheetHeader>
              <SheetDescription>
                <div className="mt-5 space-y-2">
                  <Link
                    href={`/standing/now?${searchParams}`}
                    className="flex items-center gap-2 hover:bg-secondary p-1"
                    onClick={() => setMenuSheetOpen(false)}
                  >
                    <Trophy />
                    {t("Standing")}
                  </Link>
                  <Link
                    href={`/draft/2024?${searchParams}`}
                    className="flex items-center gap-2 hover:bg-secondary p-1"
                    onClick={() => setMenuSheetOpen(false)}
                  >
                    <School />
                    {t("Draft")}
                  </Link>
                  <Link
                    href={`/roster/${LAST_NHL_SEASON}${
                      LAST_NHL_SEASON + 1
                    }?${searchParams}`}
                    className="flex items-center gap-2 hover:bg-secondary p-1"
                    onClick={() => setMenuSheetOpen(false)}
                  >
                    <Users />
                    {t("Rosters")}
                  </Link>
                </div>
              </SheetDescription>
              <SheetFooter>
                <LanguageSelector />
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <Button
            onClick={() => router.push("/")}
            variant="ghost"
            className="flex items-center gap-2"
          >
            <LucideHome />
            HockeyPool
          </Button>
          {/* <Input type="search" placeholder="TODO: add a button to search pool" /> */}
        </div>
        <div>
          <div className="float-right flex items-center gap-1">
            <ThemeToggle />
            {userSession.info && userData.info ? (
              userSession.info.isValid ? (
                userMenu(userData.info)
              ) : (
                connectButton()
              )
            ) : (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
