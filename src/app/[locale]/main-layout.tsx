"use client";

import DailyGameFeed from "@/components/daily-game-feed";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import Footer from "@/components/footer";
import { AppSidebar } from "@/components/app-sidebar";
import { DateProvider } from "@/context/date-context";
import { GamesNightProvider } from "@/context/games-night-context";
import { DailyLeadersProvider } from "@/context/daily-leaders-context";
import { ThemeToggle } from "@/components/theme-toggle";
import LanguageSelector from "@/components/language-selector";
import { Link } from "@/i18n/routing";
import InstallAppPrompt from "@/components/install-app-prompt";

export default function MainLayout({
  children,
  currentSeason,
  draftYear,
}: {
  children: React.ReactNode;
  currentSeason: string;
  draftYear: string;
}) {
  return (
    <DateProvider>
      <DailyLeadersProvider>
        <GamesNightProvider>
          <SidebarProvider>
            <AppSidebar currentSeason={currentSeason} draftYear={draftYear} />
            <SidebarInset>
              <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-1 data-[orientation=vertical]:h-4"
                />
                <Link
                  href="/"
                  className="text-sm font-semibold tracking-tight"
                >
                  slapshot<span className="text-primary">.xyz</span>
                </Link>
                <div className="ml-auto flex items-center gap-2">
                  <ThemeToggle />
                  <LanguageSelector />
                </div>
              </header>
              <div className="border-b">
                <DailyGameFeed />
              </div>
              <div className="mx-auto w-full max-w-5xl flex-1 px-2 py-6 sm:px-4 md:px-6">
                {children}
              </div>
              <Separator />
              <Footer />
              <InstallAppPrompt />
            </SidebarInset>
          </SidebarProvider>
        </GamesNightProvider>
      </DailyLeadersProvider>
    </DateProvider>
  );
}
