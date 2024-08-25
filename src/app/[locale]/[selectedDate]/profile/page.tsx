"use client";

import PageTitle from "@/components/page-title";
import { useTranslations } from "next-intl";

import dynamic from "next/dynamic";
const HankoProfile = dynamic(() => import("@/components/hanko/hanko-profile"), {
  ssr: false,
});

export default function ProfilePage() {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-sm">
      <PageTitle title={t("ProfilePageTitle")} />
      <HankoProfile />
    </div>
  );
}
