"use client";

import { useEffect, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

const queryClient = new QueryClient();

export function PersistedProvider({ children }: { children: React.ReactNode }) {
  const [persister, setPersister] = useState<any>(null);

  useEffect(() => {
    const storagePersister = createSyncStoragePersister({
      storage: window.localStorage,
    });
    setPersister(storagePersister);
  }, []);

  if (!persister) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
