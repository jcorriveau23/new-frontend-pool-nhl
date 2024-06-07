"use client";

import { useTranslations } from "next-intl";

import dynamic from "next/dynamic";
const HankoProfile = dynamic(() => import("@/components/hanko-profile"), {
  ssr: false,
});

export default function ProfilePage() {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-sm">
      <HankoProfile />
    </div>
  );
}
