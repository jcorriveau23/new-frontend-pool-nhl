"use client";

import { Link } from "@/i18n/routing";
/**
The footer of the web app.
 */

import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { TwitterLogoIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations();
  return (
    <footer className="mx-0 py-4 w-full">
      <div className="container grid grid-cols-2  gap-8">
        <div className="grid gap-1">
          <h3 className="font-bold">{t("FollowUs")}</h3>
          <Link
            href="https://twitter.com/hockeypool3"
            className="flex items-center gap-2 hover:underline text-muted-foreground"
          >
            <TwitterLogoIcon className="h-5 w-5" />
            Twitter
          </Link>
          <Link
            href="https://github.com/jcorriveau23/new-frontend-pool-nhl"
            className="flex items-center gap-2 hover:underline text-muted-foreground"
          >
            <GitHubLogoIcon className="h-5 w-5" />
            GitHub
          </Link>
        </div>
        <div className="grid gap-1">
          <h3 className="font-bold">{t("Legal")}</h3>
          <Link
            href={`/privacy-policy`}
            className="hover:underline text-muted-foreground"
          >
            {t("PrivacyPolicy")}
          </Link>
          <Link
            href={`/term-of-service?`}
            className="hover:underline text-muted-foreground"
          >
            {t("TermOfService")}
          </Link>
        </div>
        <div className="grid col-span-2">
          <p className="text-muted-foreground">© 2025 slapshot.xyz</p>
        </div>
      </div>
    </footer>
  );
}
