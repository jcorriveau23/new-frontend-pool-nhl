"use client";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { DateProvider } from "@/context/date-context";

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
    <html>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DateProvider>
            <div>{children}</div>
          </DateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
