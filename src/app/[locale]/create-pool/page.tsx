"use client";

/**
 The pool creation page.
 */

import { useTranslations } from "next-intl";
import PoolSettingsComponent from "@/components/pool-settings";
import { useSession } from "@/context/useSessionData";
import { Link } from "@/navigation";

// @ts-ignore
export default function TermOfService() {
  const t = useTranslations();
  const { isValid } = useSession();

  if (isValid === false) {
    return (
      <main>
        <p>{t("MustBeConnectedToCreatePool")}</p>{" "}
        <Link href="/login" className="text-link hover:underline">
          {t("Connect")}.
        </Link>
      </main>
    );
  }

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
