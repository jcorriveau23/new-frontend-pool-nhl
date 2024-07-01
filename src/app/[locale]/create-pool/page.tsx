"use client";

/**
 The pool creation page.
 */

import { useTranslations } from "next-intl";
import PoolSettingsComponent from "@/components/pool-settings";
import { useSession } from "@/context/useSessionData";
import { Link } from "@/navigation";
import PageTitle from "@/components/page-title";
import LoginForm from "@/components/login";

// @ts-ignore
export default function TermOfService() {
  const t = useTranslations();
  const { isValid } = useSession();

  return (
    <main>
      <PageTitle title={t("PoolCreation")} />
      {isValid ? (
        <PoolSettingsComponent
          poolName=""
          poolStatus={null}
          oldPoolSettings={null}
        />
      ) : (
        <>
          <p>{t("MustBeConnectedToCreatePool")}</p>{" "}
          <LoginForm redirect="/create-pool" />
        </>
      )}
    </main>
  );
}
