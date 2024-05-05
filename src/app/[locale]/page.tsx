import { Link } from "@/navigation";
import { unstable_setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

//@ts-ignore
export default function Home({ params: { locale } }) {
  unstable_setRequestLocale(locale);
  const t = useTranslations();
  return (
    <>
      <main className="flex-1">
        <div className="space-y-10 xl:space-y-16">
          <div className="grid gap-4 px-4 sm:px-6 md:px-10 md:grid-cols-2 md:gap-16">
            <div>
              <h1 className="lg:leading-tighter text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl xl:text-[3.4rem] 2xl:text-[3.75rem]">
                {t("ManagePool")}
              </h1>
            </div>
            <div className="space-y-6">
              <p className="text-gray-500 md:text-xl dark:text-gray-400">
                {t("AppDescription")}{" "}
                <Link
                  href="/pools/william"
                  className="text-link hover:underline"
                >
                  {t("SeeDemo")}
                </Link>
              </p>
              <p className="text-gray-500 md:text-xl dark:text-gray-400">
                {t("GetStartedNow")}
                <Link href="/pools" className="text-link hover:underline">
                  {t("CreateYourOwnPool")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
