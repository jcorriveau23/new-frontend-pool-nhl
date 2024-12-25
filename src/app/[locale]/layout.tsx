import { NextIntlClientProvider, useLocale, useMessages } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import React from "react";
import MainLayout from "./main-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NHL pool",
  description: "Fully free nhl hockey pool",
};

export default function LocaleLayout(
  props: Readonly<{
    children: React.ReactNode;
  }>
) {
  const locale = useLocale();

  const { children } = props;

  setRequestLocale(locale);
  const messages = useMessages();

  return (
    <>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <MainLayout>{children}</MainLayout>
      </NextIntlClientProvider>
    </>
  );
}
