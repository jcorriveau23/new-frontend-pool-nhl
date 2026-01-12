"use client"; //Only for NextJS App Router

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { Hanko } from "@teamhanko/hanko-elements";
import { toast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

//@ts-expect-error, known environment variable type.
const hankoApi: string = process.env.NEXT_PUBLIC_HANKO_API_URL;

export default function LogoutMenuItem() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hanko, setHanko] = useState<Hanko>();
  const t = useTranslations();

  useEffect(() => setHanko(new Hanko(hankoApi)), []);

  const logout = async () => {
    console.log("trying to logout the user.j");
    try {
      await hanko?.logout();
      router.push(`/login?${searchParams.toString()}`);
      router.refresh();
      return;
    } catch (error) {
      toast({
        variant: "destructive",
        title: `Error during logout: ${error}`,
        duration: 2000,
      });
    }
  };

  return <span onClick={logout}>{t("SignOut")}</span>;
}
