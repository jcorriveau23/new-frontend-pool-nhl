/**
 The term of service page.
 */

import PageTitle from "@/components/page-title";
import { useTranslations } from "next-intl";

export default function TermOfService() {
  const t = useTranslations();

  return (
    <main>
      <PageTitle title={t("TermOfService")} />
      <div className="flex flex-col gap-8 px-4">
        <div>
          <p className="mt-2 text-muted-foreground">
            {t("EffectiveDate")}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("AcceptanceOfTerms")}</h2>
          <p>{t("AcceptanceTerms")}</p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("UserAccounts")}</h2>
          <p>{t("UserAccountToS")}</p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("ProhibitedConduct")}</h2>
          <p>{t("ProhibitedConductAgreement")}</p>
          <ul className="flex flex-col list-disc gap-2 pl-6">
            <li>{t("ProhibitedConduct1")}</li>
            <li>{t("ProhibitedConduct2")}</li>
            <li>{t("ProhibitedConduct3")}</li>
            <li>{t("ProhibitedConduct4")}</li>
          </ul>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("IntellectualProperty")}</h2>
          <p>{t("IntellectualProperty1")}</p>
          <p>{t("IntellectualProperty2")}</p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("Termination")}</h2>
          <p>{t("Termination1")}</p>
          <p>{t("Termination2")}</p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">
            {t("LimitationOfLiability")}
          </h2>
          <p>{t("LimitationOfLiability1")}</p>
          <p>{t("LimitationOfLiability2")}</p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("GoverningLaw")}</h2>
          <p>{t("GoverningLaw1")}</p>
          <p>{t("GoverningLaw2")}</p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("ChangeToTerms")}</h2>
          <p>{t("ChangeToTermsDescription")}</p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("ContactUs")}</h2>
          <p>
            {t("ToSQuestions")}
            <a className="text-primary hover:underline">jcorriveau23@gmail.com</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
