"use client";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { NavigationBar } from "@/components/navigation-bar";
import "../lib/i18n";
import DailyGameFeed from "@/components/daily-game-feed";
import { DateProvider } from "../context/date-context";

const inter = Inter({ subsets: ["latin"] });

const metadata: Metadata = {
  title: "NHL pool",
  description: "fully free nhl hockey pool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DateProvider>
            <NavigationBar />
            <DailyGameFeed />
            <div>{children}</div>
          </DateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
