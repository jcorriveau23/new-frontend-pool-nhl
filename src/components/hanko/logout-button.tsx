"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/navigation";
import { Hanko } from "@teamhanko/hanko-elements";
import { toast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const hankoApi = process.env.NEXT_PUBLIC_HANKO_API_URL;

export default function LogoutMenuItem() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hanko, setHanko] = useState<Hanko>();
  const t = useTranslations();

  useEffect(() => {
    import("@teamhanko/hanko-elements").then(({ Hanko }) =>
      setHanko(new Hanko(hankoApi ?? ""))
    );
  }, []);

  const logout = async () => {
    try {
      await hanko?.user.logout();
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
