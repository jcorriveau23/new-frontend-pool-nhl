"use client";

import { Link } from "@/i18n/routing";
/**
The footer of the web app.
 */

import { GitHubIcon, XIcon } from "@/components/brand-icons";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Versions } from "@/lib/version";

export default function Footer({ versions }: { versions: Versions }) {
  const t = useTranslations();
  return (
    <footer className="w-full">
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 sm:grid-cols-3 md:px-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Image
              src="/logo-mark.png"
              alt="slapshot.xyz"
              width={24}
              height={24}
              className="size-6 shrink-0 rounded-md object-cover"
            />
            slapshot.xyz
          </div>
          <p className="text-muted-foreground text-sm">{t("Tagline")}</p>
          <p className="text-muted-foreground text-sm">{t("FreeForever")}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("FollowUs")}</h3>
          <Link
            href="https://x.com/hockeypool3"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
          >
            <XIcon className="size-4" />X
          </Link>
          <Link
            href="https://github.com/jcorriveau23/new-frontend-pool-nhl"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
          >
            <GitHubIcon className="size-4" />
            GitHub
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("Legal")}</h3>
          <Link
            href={`/privacy-policy`}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {t("PrivacyPolicy")}
          </Link>
          <Link
            href={`/term-of-service`}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {t("TermOfService")}
          </Link>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 md:px-6">
          <p className="text-muted-foreground text-xs">© 2026 slapshot.xyz</p>
          {/*
            The running builds, so a bug report can name them. `web` is
            compiled in; `api` is absent whenever the backend could not be
            reached, and the row then shows the web build on its own rather
            than an empty placeholder.
          */}
          <p className="text-muted-foreground font-mono text-xs">
            <span title={t("FrontendVersion")}>web {versions.web}</span>
            {versions.api !== null && (
              <>
                <span aria-hidden="true"> · </span>
                <span title={t("BackendVersion")}>api {versions.api}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
