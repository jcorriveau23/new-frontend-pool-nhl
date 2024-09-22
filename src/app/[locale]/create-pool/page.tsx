"use client";

/**
 The pool creation page.
 */

import { useTranslations } from "next-intl";
import PoolSettingsComponent from "@/components/pool-settings";
import { useSession } from "@/context/useSessionData";
import PageTitle from "@/components/page-title";
import LoginForm from "@/components/login";

// @ts-ignore
export default function TermOfService() {
  const t = useTranslations();
  const userSession = useSession();

  return (
    <main>
      <PageTitle title={t("PoolCreationPageTitle")} />
      {userSession.info?.jwt ? (
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
