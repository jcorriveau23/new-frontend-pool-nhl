"use client";

import DailyGameFeed from "@/components/daily-game-feed";
import {
  SidebarProvider,
  SidebarTrigger,
  MobileSidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import Footer from "@/components/footer";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { LucideHome } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
            <Main>{children}</Main>
          </SidebarProvider>
        </GamesNightProvider>
      </DailyLeadersProvider>
    </DateProvider>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  const { open, isMobile, isLoading } = useSidebar();
  const router = useRouter();

  return (
    <main
      className={
        !isLoading && !isMobile && open == true
          ? "w-[calc(100vw-var(--sidebar-width))]"
          : "w-screen"
      }
    >
      {isLoading ? (
        <LoadingSpinner />
      ) : isMobile ? (
        <>
          <div className="flex items-center gap-1">
            <MobileSidebarTrigger />
            <Button
              onClick={() => router.push("/")}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <LucideHome />
              SlapShot
            </Button>
          </div>
          <Separator />
        </>
      ) : (
        <div>
          <SidebarTrigger />
          {isLoading}
        </div>
      )}
      <DailyGameFeed />
      <Separator />
      <div className="py-4 px-0 sm:px-4 md:px-6 mx-auto max-w-5xl">
        {children}
      </div>
      <Separator />
      <Footer />
    </main>
  );
}
