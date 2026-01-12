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

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DateProvider>
      <DailyLeadersProvider>
        <GamesNightProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <main>
                <SidebarTrigger />
                <DailyGameFeed />
                <Separator />
                <div className="py-4 px-0 sm:px-4 md:px-6 mx-auto max-w-5xl">
                  {children}
                </div>
                <Separator />
                <Footer />
              </main>
            </SidebarInset>
          </SidebarProvider>
        </GamesNightProvider>
      </DailyLeadersProvider>
    </DateProvider>
  );
}
