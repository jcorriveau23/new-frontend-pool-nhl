"use client";

import {
  HomeIcon,
  PencilIcon,
  Database,
  Trophy,
  School,
  Users,
  User2,
  ChevronUp,
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
import { Button } from "./ui/button";
import { useRouter } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import LogoutMenuItem from "./hanko/logout-button";
import LanguageSelector from "./language-selector";
import { ThemeToggle } from "./theme-toggle";

// Menu items.
const hockeyPoolItems = [
  {
    title: "Home",
    url: "/",
    icon: HomeIcon,
  },
  {
    title: "PoolList",
    url: `pools/${CURRENT_NHL_SEASON}`,
    icon: Database,
  },
  {
    title: "CreatePool",
    url: "create-pool",
    icon: PencilIcon,
  },
];

// Menu items.
const nhlItems = [
  {
    title: "Standing",
    url: "standing/now",
    icon: Trophy,
  },
  {
    title: "Draft",
    url: `draft/${CURRENT_DRAFT_YEAR}`,
    icon: School,
  },
  {
    title: "Rosters",
    url: `roster/${CURRENT_NHL_SEASON}`,
    icon: Users,
  },
];

export function AppSidebar() {
  const t = useTranslations();
  const user = useUser();
  const router = useRouter();
  const { setOpenMobile, isMobile } = useSidebar();

  const userMenu = (userInfo: HankoUser) => (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton>
                <User2 /> {userInfo.email}
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              className="w-[--radix-popper-anchor-width]"
            >
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <span>{t("Account")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <LogoutMenuItem />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );

  const connectButton = () => (
    <Button variant="outline" onClick={() => router.push("/login")}>
      {t("Connect")}
    </Button>
  );

  const navigate = (url: string) => {
    router.push(`/${url}`);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>HockeyPool.live</SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("MainPages")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hockeyPoolItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton className="hover:cursor-pointer" asChild>
                    <a onClick={() => navigate(item.url)}>
                      <item.icon />
                      <span>{t(item.title)}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("NhlStatsPages")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nhlItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton className="hover:cursor-pointer" asChild>
                    <a onClick={() => navigate(item.url)}>
                      <item.icon />
                      <span>{t(item.title)}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter />
      <SidebarMenu>
        {user.info && user.info.isValid ? userMenu(user.info) : connectButton()}
      </SidebarMenu>
      <SidebarMenu>
        <ThemeToggle />
      </SidebarMenu>
      <SidebarMenu>
        <LanguageSelector />
      </SidebarMenu>
    </Sidebar>
  );
}
