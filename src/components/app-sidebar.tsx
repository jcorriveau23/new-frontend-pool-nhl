"use client";

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
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTranslations } from "next-intl";
import { CURRENT_DRAFT_YEAR, CURRENT_NHL_SEASON } from "@/lib/nhl";
import { HankoUser, useUser } from "@/context/useUserData";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import LogoutMenuItem from "./hanko/logout-button";

// Menu items.
const hockeyPoolItems = [
  {
    title: "Home",
    url: "/",
    icon: HomeIcon,
  },
  {
    title: "PoolList",
    url: `/pools/${CURRENT_NHL_SEASON}`,
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
    url: `/draft/${CURRENT_DRAFT_YEAR}`,
    icon: School,
  },
  {
    title: "Rosters",
    url: `/roster/${CURRENT_NHL_SEASON}`,
    icon: Users,
  },
  {
    title: "Players",
    url: `/players`,
    icon: UserCog,
  },
];

export function AppSidebar() {
  const t = useTranslations();
  const user = useUser();
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
          <DropdownMenuItem>
            <LogoutMenuItem />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );

  const connectButton = () => (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={
          <Link
            href="/login"
            onClick={closeOnMobile}
          />
        }
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
              <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Trophy className="size-4" />
              </div>
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
        <SidebarGroup>
          <SidebarGroupLabel>{t("MainPages")}</SidebarGroupLabel>
          <SidebarGroupContent>{renderMenuItems(hockeyPoolItems)}</SidebarGroupContent>
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
