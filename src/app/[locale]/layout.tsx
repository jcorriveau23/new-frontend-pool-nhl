// Can be imported from a shared config
const locales = ["en", "fr"];

import { NavigationBar } from "@/components/navigation-bar";
import DailyGameFeed from "@/components/daily-game-feed";
import { NextIntlClientProvider, useMessages } from "next-intl";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  // Receive messages provided in `i18n.ts`
  const messages = useMessages();

  return (
    <>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <NavigationBar />
        <DailyGameFeed />
        <div>{children}</div>
      </NextIntlClientProvider>
    </>
  );
}
