/**
 The privacy/policy page.
 */

import { unstable_setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import PageTitle from "@/components/page-title";

// @ts-ignore
export default function PrivacyPolicy({ params: { locale } }) {
  unstable_setRequestLocale(locale);
  const t = useTranslations();

  return (
    <main>
      <PageTitle title={t("PrivacyPolicy")} />
      <div className="space-y-8 px-4">
        <div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t("EffectiveDate")}
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("InformationWeCollect")}</h2>
          <p>{t("InformationWeCollectDescription")}</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>{t("PersonalInformation")}: </strong>
              {t("InformationWeCollect1")}
            </li>
            <li>
              <strong>{t("PoolInformations")}: </strong>
              {t("InformationWeCollect2")}
            </li>
          </ul>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {t("HowWeStoreAndSecureYourData")}
          </h2>
          <p>{t("HowWeStoreAndSecureYourData1")}</p>
          <p>{t("HowWeStoreAndSecureYourData2")}</p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {t("DataSharingAndConsent")}
          </h2>
          <p>{t("DataSharingAndConsent1")}</p>
          <p>{t("DataSharingAndConsent2")}</p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("YourRightsAndChoices")}</h2>
          <p>{t("YourRightsAndChoices1")}</p>
          <p>
            {t("YourRightsAndChoices2")}
            <a className="text-link hover:underline" href="#">
              jcorriveau23@gmail.com
            </a>
            .
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("PrivacyPolicyChanges")}</h2>
          <p>{t("PrivacyPolicyChangesDescription")}</p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("ContactUs")}</h2>
          <p>
            {t("PrivacyPolicyQuestions")}
            <a className="text-link hover:underline" href="#">
              jcorriveau23@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
