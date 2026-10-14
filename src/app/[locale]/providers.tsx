"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/context/useUserData";
import { UserSessionProvider } from "@/context/useSessionData";
import { Toaster } from "@/components/ui/sonner";
import { PersistedProvider } from "@/context/persisted-query-provider";

/*
The client-side provider stack, split out of the layout so the layout itself can
stay a Server Component. That is what lets it read the locale and put it on
`<html lang>`: a client root layout has no access to the route segment.

The injury report is read in `main-layout.tsx` rather than here, because it is
needed on hockey routes only and this stack has no view of the route.
*/
export default function Providers({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <UserProvider>
        <UserSessionProvider>
          <PersistedProvider>
            <div>{children}</div>
          </PersistedProvider>
        </UserSessionProvider>
      </UserProvider>
      <Toaster />
    </ThemeProvider>
  );
}
