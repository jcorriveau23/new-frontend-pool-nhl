import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, setRequestLocale } from "next-intl/server";
import React from "react";
import MainLayout from "./main-layout";
import { Metadata, Viewport } from "next";
import {
  currentDraftYear,
  currentSeason,
  getSeasonInfo,
} from "@/lib/season-info";

export const metadata: Metadata = {
  // Pages that set their own title (the pool page uses the pool name) get it
  // suffixed by the template, every other page falls back to the default.
  title: {
    default: "NHL pool",
    template: "%s | NHL pool",
  },
  description: "Fully free nhl hockey pool",
  // iOS ignores the manifest: these are what make an installed home-screen
  // shortcut launch without Safari's chrome and carry the right name.
  appleWebApp: {
    capable: true,
    title: "slapshot.xyz",
    // "default" keeps the status bar as its own opaque strip. "black-translucent"
    // would draw the page underneath it and overlap the sticky header.
    statusBarStyle: "default",
  },
};

// Tints the browser and status bar to match the app background. Two entries so
// it tracks the system colour scheme the way `next-themes` does.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#060c13" },
  ],
};

export default async function LocaleLayout(
  props: Readonly<{
    children: React.ReactNode;
  }>
) {
  const locale = await getLocale();

  const { children } = props;

  setRequestLocale(locale);
  const messages = await getMessages();
  const seasonInfo = await getSeasonInfo();

  return (
    <>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <MainLayout
          currentSeason={currentSeason(seasonInfo)}
          draftYear={currentDraftYear(seasonInfo)}
        >
          {children}
        </MainLayout>
      </NextIntlClientProvider>
    </>
  );
}
