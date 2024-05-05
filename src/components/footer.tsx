"use server";

/**
The footer of the web app.
 */
import { Link } from "@/navigation";

import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { TwitterLogoIcon } from "@radix-ui/react-icons";
import { getTranslations } from "next-intl/server";

export default async function Footer() {
  const t = await getTranslations();
  return (
    <footer className="mx-0 py-4 w-full">
      <div className="container grid grid-cols-2  gap-8">
        <div className="grid gap-1">
          <h3 className="font-semibold">{t("FollowUs")}</h3>
          <Link
            href="https://twitter.com/hockeypool3"
            className="flex items-center gap-2 hover:underline"
          >
            <TwitterLogoIcon className="h-5 w-5" />
            Twitter
          </Link>
          <Link
            href="https://github.com/jcorriveau23/new-frontend-pool-nhl"
            className="flex items-center gap-2 hover:underline"
          >
            <GitHubLogoIcon className="h-5 w-5" />
            GitHub
          </Link>
        </div>
        <div className="grid gap-1">
          <h3 className="font-semibold">{t("Legal")}</h3>
          <Link href="/privacy-policy" className="hover:underline">
            {t("PrivacyPolicy")}
          </Link>
          <Link href="/term-of-service" className="hover:underline">
            {t("TermOfService")}
          </Link>
        </div>
        <div className="grid col-span-2">
          <p className="text-gray-500 dark:text-gray-400">
            © 2024 hockeypool.live
          </p>
        </div>
      </div>
    </footer>
  );
}
