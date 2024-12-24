"use client";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/context/useUserData";
import { UserSessionProvider } from "@/context/useSessionData";
import { Toaster } from "@/components/ui/toaster";
import { InjuredPlayersProvider } from "@/context/injury-context";
import { PersistedProvider } from "@/context/persisted-query-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body>
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
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
