"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import Footer from "@/components/footer";
import { AppSidebar } from "@/components/app-sidebar";
import DailyGameFeedSkeleton from "@/components/daily-game-feed-skeleton";
import { DateProvider } from "@/context/date-context";
import { GamesNightProvider } from "@/context/games-night-context";
import { InjuredPlayersProvider } from "@/context/injury-context";
import { ThemeToggle } from "@/components/theme-toggle";
import LanguageSelector from "@/components/language-selector";
import { Link, usePathname } from "@/i18n/routing";
import InstallAppPrompt from "@/components/install-app-prompt";
import { routePageReadsNhlData, routeShowsGameFeed } from "@/lib/app-chrome";
import type { Versions } from "@/lib/version";

/*
Split into its own chunk rather than imported outright. A static import would
put the strip — and with it the game tiles, the scroll area and the date
picker's calendar — into this shell's bundle, which every route downloads
including the pages that never render it. Server rendering is left on, so the
routes that do render it still paint its skeleton in their HTML.
*/
const DailyGameFeed = dynamic(() => import("@/components/daily-game-feed"));

export default function MainLayout({
  children,
  currentSeason,
  draftYear,
  versions,
}: {
  children: React.ReactNode;
  currentSeason: string;
  draftYear: string;
  versions: Versions;
}) {
  /*
  Every route renders inside this shell, so until this split the score strip
  and the three reads behind it — the day's games, the day's leaders and the
  injury report — ran on the legal pages and the sign-in screen too, where none
  of it is shown.

  Note where the boundary sits: below the header, not around it.
  `SidebarProvider` initialises its open state from `defaultOpen` rather than
  from the cookie it writes, so remounting it on a navigation would silently
  re-expand a sidebar the user had collapsed. Keeping it above the branch means
  the sidebar and header survive the transition; only the page area under them
  is rebuilt, which a navigation does anyway.
  */
  const pathname = usePathname();
  const showsFeed = routeShowsGameFeed(pathname);
  const pageReadsNhlData = routePageReadsNhlData(pathname);

  const feed = (
    <div className="border-b">
      <DailyGameFeed />
    </div>
  );

  const page = (
    <>
      <div className="mx-auto w-full max-w-5xl flex-1 px-2 py-6 sm:px-4 md:px-6">
        {children}
      </div>
      <Separator />
      <Footer versions={versions} />
      <InstallAppPrompt />
    </>
  );

  let body;
  if (pageReadsNhlData) {
    // A hockey screen: one provider tree over the strip and the page together,
    // so both read the same selected date rather than two copies of it.
    body = (
      <DateProvider>
        <GamesNightProvider>
          <InjuredPlayersProvider>
            {feed}
            {page}
          </InjuredPlayersProvider>
        </GamesNightProvider>
      </DateProvider>
    );
  } else if (showsFeed) {
    /*
    The landing page: it shows the strip, but its own content reads none of
    this. So the provider goes around the strip alone and behind a Suspense
    boundary — `DateProvider` reads `useSearchParams`, which a prerender cannot
    answer, and without the boundary Next fails the build instead of falling
    back. The page below it then still prerenders.

    Only `DateProvider` is mounted here: the strip needs the selected date, and
    nothing in it reaches for the games-night or injury contexts — so the
    landing page does not download the injury report either.
    */
    body = (
      <>
        <Suspense
          fallback={
            <div className="border-b">
              <DailyGameFeedSkeleton />
            </div>
          }
        >
          <DateProvider>{feed}</DateProvider>
        </Suspense>
        {page}
      </>
    );
  } else {
    body = page;
  }

  return (
    <SidebarProvider>
      <AppSidebar currentSeason={currentSeason} draftYear={draftYear} />
      <SidebarInset className="min-w-0 pb-[var(--app-bottom-inset)]">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-1 data-[orientation=vertical]:h-4"
          />
          <Link href="/" className="text-sm font-semibold tracking-tight">
            slapshot<span className="text-primary">.xyz</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <LanguageSelector />
          </div>
        </header>
        {body}
      </SidebarInset>
    </SidebarProvider>
  );
}
