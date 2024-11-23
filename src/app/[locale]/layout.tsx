// Can be imported from a shared config
const locales = ["en", "fr"];

import { NextIntlClientProvider, useMessages } from "next-intl";
import { unstable_setRequestLocale } from "next-intl/server";
import React from "react";
import MainLayout from "./main-layout";

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
  // This is a limitation that we aim to remove in the future, but as a stopgap solution,
  // next-intl provides a temporary API that can be used to enable static rendering:
  // https://next-intl-docs.vercel.app/docs/getting-started/app-router
  unstable_setRequestLocale(locale);
  const messages = useMessages();

  return (
    <>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <MainLayout>{children}</MainLayout>
      </NextIntlClientProvider>
    </>
  );
}
