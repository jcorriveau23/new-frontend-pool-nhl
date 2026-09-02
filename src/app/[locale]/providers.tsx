"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/context/useUserData";
import { UserSessionProvider } from "@/context/useSessionData";
import { Toaster } from "@/components/ui/sonner";
import { InjuredPlayersProvider } from "@/context/injury-context";
import { PersistedProvider } from "@/context/persisted-query-provider";

/*
The client-side provider stack, split out of the layout so the layout itself can
stay a Server Component. That is what lets it read the locale and put it on
`<html lang>`: a client root layout has no access to the route segment.
*/
export default function Providers({
  children,
  nonce,
}: Readonly<{ children: React.ReactNode; nonce?: string }>) {
  return (
    <ThemeProvider
      // next-themes writes an inline script that sets the theme class before
      // first paint. Without the nonce the CSP blocks it and every load flashes
      // the wrong theme before hydration catches up.
      nonce={nonce}
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
  );
}
