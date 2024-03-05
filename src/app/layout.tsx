"use client";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { NavigationBar } from "@/components/navigation-bar";
import "../lib/i18n";

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
    <html lang="en">
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NavigationBar />
          <div>{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
