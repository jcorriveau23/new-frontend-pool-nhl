"use client";

/**
 The pool creation page.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import PoolSettingsComponent from "@/components/pool-settings";
import PoolKindQuestionnaire, {
  type PoolKind,
} from "@/components/pool-kind-questionnaire";
import SurvivorPoolSettings from "@/components/survivor-pool-settings";
import { Button } from "@/components/ui/button";
import { useSession } from "@/context/useSessionData";
import { cn } from "@/lib/utils";
import PageTitle from "@/components/page-title";
import LoginForm from "@/components/login";

export default function CreatePoolPage() {
  const t = useTranslations();
  const userSession = useSession();
  const [poolKind, setPoolKind] = React.useState<PoolKind | null>(null);

  if (!userSession.info?.jwt) {
    return (
      <main>
        <PageTitle title={t("PoolCreationPageTitle")} />
        <p>{t("MustBeConnectedToCreatePool")}</p>{" "}
        <LoginForm redirect="/create-pool" />
      </main>
    );
  }

  if (poolKind === null) {
    return (
      <main>
        <PageTitle title={t("PoolCreationPageTitle")} />
        <PoolKindQuestionnaire onSelect={setPoolKind} />
      </main>
    );
  }

  return (
    // The survivor form is four fields and reads badly stretched across a wide
    // window, the same reason its own route holds it to this width. The roster
    // form sets no width of its own and wants the whole page.
    <main className={cn(poolKind === "survivor" && "mx-auto max-w-2xl px-4")}>
      <PageTitle
        title={
          poolKind === "survivor"
            ? t("CreateSurvivorPool")
            : t("PoolCreationPageTitle")
        }
        subtitle={
          poolKind === "survivor" ? t("SurvivorPoolExplanation") : undefined
        }
      />
      <div className="pb-4 text-left">
        <Button variant="ghost" size="sm" onClick={() => setPoolKind(null)}>
          <ArrowLeft data-icon="inline-start" />
          {t("ChangePoolKind")}
        </Button>
      </div>
      {poolKind === "survivor" ? (
        <SurvivorPoolSettings />
      ) : (
        <PoolSettingsComponent
          poolName=""
          poolStatus={null}
          oldPoolSettings={null}
        />
      )}
    </main>
  );
}
