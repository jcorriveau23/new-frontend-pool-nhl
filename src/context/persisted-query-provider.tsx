"use client";

import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

/*
The query cache, kept in localStorage across reloads.
*/
const persister = createAsyncStoragePersister({
  storage: typeof window === "undefined" ? undefined : window.localStorage,
});

export function PersistedProvider({ children }: { children: React.ReactNode }) {
  /*
  One client per mount, not one per module. A module-level client is shared by
  every request the server handles, and now that this provider renders during
  SSR that would let one visitor's queries be read by another's page.
  */
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
