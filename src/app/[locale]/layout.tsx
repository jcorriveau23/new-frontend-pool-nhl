import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, setRequestLocale } from "next-intl/server";
import React from "react";
import MainLayout from "./main-layout";
import { Metadata } from "next";
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
