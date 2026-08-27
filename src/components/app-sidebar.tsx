"use client";

import * as React from "react";
import {
  HomeIcon,
  PencilIcon,
  Database,
  Trophy,
  School,
  Users,
  User2,
  UserCog,
  ChevronUp,
  LogInIcon,
  Star,
  X,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { HankoUser, useUser } from "@/context/useUserData";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import LogoutMenuItem from "./hanko/logout-button";
import { useFavoritePools } from "@/hooks/use-favorite-pools";
import { seasonFormat } from "@/app/utils/formating";

export function AppSidebar({
  currentSeason,
  draftYear,
}: {
  currentSeason: string;
  draftYear: string;
}) {
  const t = useTranslations();

  // Menu items.
  const hockeyPoolItems = [
    {
      title: "Home",
      url: "/",
      icon: HomeIcon,
    },
    {
      title: "PoolList",
      url: `/pools/${currentSeason}`,
      icon: Database,
    },
    {
      title: "CreatePool",
      url: "/create-pool",
      icon: PencilIcon,
    },
  ];

  // Menu items.
  const nhlItems = [
    {
      title: "Standing",
      url: "/standing/now",
      icon: Trophy,
    },
    {
      title: "Draft",
      url: `/draft/${draftYear}`,
      icon: School,
    },
    {
      title: "Rosters",
      url: `/roster/${currentSeason}`,
      icon: Users,
    },
    {
      title: "Players",
      url: `/players`,
      icon: UserCog,
    },
  ];

  const user = useUser();
  const { favorites, toggleFavorite } = useFavoritePools();

  const favoritesBySeason = React.useMemo(() => {
    const groups = new Map<number | null, string[]>();
    for (const { name, season } of favorites) {
      groups.set(season, [...(groups.get(season) ?? []), name]);
    }
    return Array.from(groups, ([season, poolNames]) => ({
      season,
      poolNames: poolNames.sort((a, b) => a.localeCompare(b)),
    })).sort((a, b) => (b.season ?? 0) - (a.season ?? 0));
  }, [favorites]);
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();

  const closeOnMobile = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  const renderMenuItems = (items: typeof hockeyPoolItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            isActive={isActive(item.url)}
            render={<Link href={item.url} onClick={closeOnMobile} />}
          >
            <item.icon />
            <span>{t(item.title)}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  const userMenu = (userInfo: HankoUser) => (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
          <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
            <User2 className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 overflow-hidden leading-none">
            <span className="truncate text-sm font-medium">{t("Profile")}</span>
            {userInfo.email && (
              <span className="text-muted-foreground truncate text-xs">
                {userInfo.email}
              </span>
            )}
          </div>
          <ChevronUp className="ml-auto" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" className="w-(--anchor-width)">
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <span>{t("Account")}</span>
          </DropdownMenuItem>
          <LogoutMenuItem />
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );

  const connectButton = () => (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href="/login" onClick={closeOnMobile} />}
      >
        <LogInIcon />
        <span>{t("Connect")}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" onClick={closeOnMobile} />}
            >
              <Image
                src="/logo-mark.png"
                alt="slapshot.xyz"
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-lg object-cover"
                priority
              />
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold tracking-tight">
                  slapshot.xyz
                </span>
                <span className="text-muted-foreground text-xs">
                  {t("Tagline")}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {favoritesBySeason.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>{t("Favorites")}</SidebarGroupLabel>
            <SidebarGroupContent>
              {favoritesBySeason.map(({ season, poolNames }) => (
                <div key={season ?? "unknown-season"}>
                  {season !== null ? (
                    <div className="text-muted-foreground/70 px-2 pb-0.5 pt-1 text-xs font-medium">
                      {seasonFormat(season, 0)}
                    </div>
                  ) : null}
                  <SidebarMenu>
                    {poolNames.map((poolName) => (
                      <SidebarMenuItem key={poolName}>
                        <SidebarMenuButton
                          isActive={isActive(`/pool/${poolName}`)}
                          render={
                            <Link
                              href={`/pool/${poolName}`}
                              onClick={closeOnMobile}
                            />
                          }
                        >
                          <Star />
                          <span className="truncate">{poolName}</span>
                        </SidebarMenuButton>
                        <SidebarMenuAction
                          showOnHover
                          aria-label={t("RemoveFromFavorites", {
                            pool: poolName,
                          })}
                          onClick={() => toggleFavorite(poolName)}
                        >
                          <X />
                        </SidebarMenuAction>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </div>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
        <SidebarGroup>
          <SidebarGroupLabel>{t("MainPages")}</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(hockeyPoolItems)}
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("NhlStatsPages")}</SidebarGroupLabel>
          <SidebarGroupContent>{renderMenuItems(nhlItems)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {user.info && user.info.isValid
            ? userMenu(user.info)
            : connectButton()}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
