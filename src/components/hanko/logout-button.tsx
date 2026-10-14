"use client"; //Only for NextJS App Router

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { Hanko } from "@teamhanko/hanko-elements";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

//@ts-expect-error, known environment variable type.
const hankoApi: string = process.env.NEXT_PUBLIC_HANKO_API_URL;

export default function LogoutMenuItem() {
  const router = useRouter();
  const [hanko, setHanko] = useState<Hanko>();
  const t = useTranslations();

  useEffect(() => setHanko(new Hanko(hankoApi)), []);

  const logout = async () => {
    try {
      await hanko?.logout();
      const query = window.location.search.replace(/^\?/, "");
      router.push(query ? `/login?${query}` : "/login");
      router.refresh();
      return;
    } catch (error) {
      toast.error(t("LogoutError", { error: String(error) }), {
        duration: 2000,
      });
    }
  };

  return <DropdownMenuItem onClick={logout}>{t("SignOut")}</DropdownMenuItem>;
}
