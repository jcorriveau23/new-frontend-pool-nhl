"use client";

import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/context/useUserData";
import { UserSessionProvider } from "@/context/useSessionData";
import { Toaster } from "@/components/ui/toaster";
import { Suspense } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

import { InjuredPlayersProvider } from "@/context/injury-context";

const metadata: Metadata = {
  title: "NHL pool",
  description: "fully free nhl hockey pool",
};

const queryClient = new QueryClient();

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister }}
        >
          <InjuredPlayersProvider>
            <UserProvider>
              <Suspense fallback={null}>
                <UserSessionProvider>
                  <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                  >
                    <div>{children}</div>
                  </ThemeProvider>
                </UserSessionProvider>
              </Suspense>
            </UserProvider>
          </InjuredPlayersProvider>
        </PersistQueryClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
