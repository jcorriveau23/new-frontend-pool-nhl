/**
 The privacy/policy page.
*/

import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import PageTitle from "@/components/page-title";

/*
Prerendered, one copy per locale. `generateStaticParams` sits on the page
rather than on the `[locale]` layout on purpose: on the layout it would ask
Next to prerender every route in the app, and the hockey screens cannot be —
they mount `DateProvider`, which reads the request's search params. Opting in
page by page keeps those dynamic and costs this page nothing.
*/
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PrivacyPolicy(props: {
  params: Promise<{ locale: string }>;
}) {
  // Static page: the locale comes from the route segment so it can
  // prerender, rather than from the incoming request.
  const { locale } = await props.params;

  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main>
      <PageTitle title={t("PrivacyPolicy")} />
      <div className="flex flex-col gap-8 px-4">
        <div>
          <p className="mt-2 text-muted-foreground">{t("EffectiveDate")}</p>
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
