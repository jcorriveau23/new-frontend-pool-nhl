import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import React from "react";
import MainLayout from "./main-layout";
import Providers from "./providers";
import { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  currentDraftYear,
  currentSeason,
  getSeasonInfo,
} from "@/lib/season-info";
import { getVersions } from "@/lib/version";
import { siteUrl } from "@/lib/site";
import "../globals.css";

/*
This is the app's root layout — it owns <html> and <body>. It lives under
`[locale]` rather than at `app/` so it can read the route's locale and put it on
`<html lang>`; Next.js supports a root layout under a dynamic segment for
exactly this case. `app/layout.tsx` is deliberately absent.
*/

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const SITE_NAME = "slapshot.xyz";
const DEFAULT_TITLE = "NHL pool";
const DEFAULT_DESCRIPTION =
  "Create your own NHL pool and manage draft, alignment changes, trades and dynasty pools. Fully free.";

export const metadata: Metadata = {
  // Makes every relative URL below (and in each page's own metadata) resolve
  // against the public origin. Open Graph consumers reject relative image URLs,
  // so without this the social card silently has no image.
  metadataBase: new URL(siteUrl),
  // Pages that set their own title (the pool page uses the pool name) get it
  // suffixed by the template, every other page falls back to the default.
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${DEFAULT_TITLE}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  // The card unfurled when a pool link is pasted into iMessage, Discord or
  // Slack. `openGraph.images` is not set here on purpose: the sibling
  // `opengraph-image.tsx` fills it in, for this layout and every page under it.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  // iOS ignores the manifest: these are what make an installed home-screen
  // shortcut launch without Safari's chrome and carry the right name.
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
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
  // Set per request by `proxy.ts`, alongside the CSP that names it.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const { children } = props;

  setRequestLocale(locale);
  const messages = await getMessages();
  const seasonInfo = await getSeasonInfo();
  const versions = await getVersions();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        <Providers nonce={nonce}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <MainLayout
              currentSeason={currentSeason(seasonInfo)}
              draftYear={currentDraftYear(seasonInfo)}
              versions={versions}
            >
              {children}
            </MainLayout>
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
