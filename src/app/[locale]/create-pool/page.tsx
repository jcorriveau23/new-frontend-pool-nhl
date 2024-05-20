"use client";

/**
 The pool creation page.
 */

import { useTranslations } from "next-intl";
import PoolSettingsComponent from "@/components/pool-settings";

// @ts-ignore
export default function TermOfService() {
  const t = useTranslations();

  return (
    <main>
      <PoolSettingsComponent
        poolName=""
        poolStatus={null}
        oldPoolSettings={null}
      />
    </main>
  );
}
