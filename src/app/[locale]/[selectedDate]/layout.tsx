// Can be imported from a shared config
const locales = ["en", "fr"];

import DailyGameFeed from "@/components/daily-game-feed";
import { NextIntlClientProvider, useMessages } from "next-intl";
import { GamesNightProvider } from "@/context/games-night-context";
import { unstable_setRequestLocale } from "next-intl/server";
import Footer from "@/components/footer";
import { Separator } from "@/components/ui/separator";
import NavigationBar from "@/components/navigation-bar";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params: { locale, selectedDate },
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string; selectedDate: string };
}>) {
  // Receive messages provided in `i18n.ts`
  // This is a limitation that we aim to remove in the future, but as a stopgap solution,
  // next-intl provides a temporary API that can be used to enable static rendering:
  // https://next-intl-docs.vercel.app/docs/getting-started/app-router
  unstable_setRequestLocale(locale);
  const messages = useMessages();

  return (
    <>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <NavigationBar params={{ selectedDate }} />
        <Separator />
        <GamesNightProvider>
          <DailyGameFeed params={{ selectedDate }} />
          <Separator />
          <div className="py-4 px-0 sm:px:4 md:px-6 mx-auto max-w-5xl">
            {children}
          </div>
        </GamesNightProvider>
        <Separator />
        <Footer params={{ selectedDate }} />
      </NextIntlClientProvider>
    </>
  );
}
