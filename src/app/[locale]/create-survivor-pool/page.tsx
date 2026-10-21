"use client";

/*
The survivor pool creation page.

Kept as its own route after the pool-type question moved onto `/create-pool`:
the sidebar links straight here, and so do people who already know which pool
type they want. The form itself lives in `survivor-pool-settings` because that
page renders it too.
*/

import { useTranslations } from "next-intl";

import LoginForm from "@/components/login";
import PageTitle from "@/components/page-title";
import SurvivorPoolSettings from "@/components/survivor-pool-settings";
import { useSession } from "@/context/useSessionData";

export default function CreateSurvivorPoolPage() {
  const t = useTranslations();
  const userSession = useSession();

  if (!userSession.info?.jwt) {
    return (
      <main className="mx-auto max-w-2xl px-4">
        <PageTitle title={t("CreateSurvivorPool")} />
        <p>{t("MustBeConnectedToCreatePool")}</p>
        <LoginForm redirect="/create-survivor-pool" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4">
      <PageTitle
        title={t("CreateSurvivorPool")}
        subtitle={t("SurvivorPoolExplanation")}
      />
      <SurvivorPoolSettings />
    </main>
  );
}
