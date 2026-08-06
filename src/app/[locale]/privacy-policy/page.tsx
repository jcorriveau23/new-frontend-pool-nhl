/**
 The privacy/policy page.
*/

import { useTranslations } from "next-intl";
import PageTitle from "@/components/page-title";

export default function PrivacyPolicy() {
  const t = useTranslations();

  return (
    <main>
      <PageTitle title={t("PrivacyPolicy")} />
      <div className="flex flex-col gap-8 px-4">
        <div>
          <p className="mt-2 text-muted-foreground">
            {t("EffectiveDate")}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("InformationWeCollect")}</h2>
          <p>{t("InformationWeCollectDescription")}</p>
          <ul className="flex flex-col list-disc gap-2 pl-6">
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
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">
            {t("HowWeStoreAndSecureYourData")}
          </h2>
          <p>{t("HowWeStoreAndSecureYourData1")}</p>
          <p>{t("HowWeStoreAndSecureYourData2")}</p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">
            {t("DataSharingAndConsent")}
          </h2>
          <p>{t("DataSharingAndConsent1")}</p>
          <p>{t("DataSharingAndConsent2")}</p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("YourRightsAndChoices")}</h2>
          <p>{t("YourRightsAndChoices1")}</p>
          <p>
            {t("YourRightsAndChoices2")}
            <a className="text-primary hover:underline" href="#">
              jcorriveau23@gmail.com
            </a>
            .
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("PrivacyPolicyChanges")}</h2>
          <p>{t("PrivacyPolicyChangesDescription")}</p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("ContactUs")}</h2>
          <p>
            {t("PrivacyPolicyQuestions")}
            <a className="text-primary hover:underline" href="#">
              jcorriveau23@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
