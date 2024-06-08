"use client";

import { useTranslations } from "next-intl";

import dynamic from "next/dynamic";
const HankoAuth = dynamic(() => import("@/components/hanko/hanko-auth"), {
  ssr: false,
});

export default function LoginForm() {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-sm">
      <HankoAuth />
    </div>
  );
}
