"use client";

import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/context/useUserData";
import { UserSessionProvider } from "@/context/useSessionData";
import { Toaster } from "@/components/ui/sonner";
import { InjuredPlayersProvider } from "@/context/injury-context";
import { PersistedProvider } from "@/context/persisted-query-provider";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UserProvider>
            <UserSessionProvider>
              <PersistedProvider>
                <InjuredPlayersProvider>
                  <div>{children}</div>
                </InjuredPlayersProvider>
              </PersistedProvider>
            </UserSessionProvider>
          </UserProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
