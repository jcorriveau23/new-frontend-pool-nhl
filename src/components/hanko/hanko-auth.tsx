"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "@/navigation";
import { register, Hanko } from "@teamhanko/hanko-elements";
import { useLocale } from "next-intl";
import { en } from "@teamhanko/hanko-elements/i18n/en";
import { fr } from "@teamhanko/hanko-elements/i18n/fr";
import "./hanko.css";

import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";

//@ts-ignore
const hankoApi: string = process.env.NEXT_PUBLIC_HANKO_API_URL;

interface Props {
  redirect: string;
}

export default function HankoAuth(props: Props) {
  const router = useRouter();

  const [hanko, setHanko] = useState<Hanko>();
  const locale = useLocale();
  const userSession = useSession();
  const userData = useUser();

  useEffect(() => {
    import("@teamhanko/hanko-elements").then(({ Hanko }) =>
      setHanko(new Hanko(hankoApi))
    );
  }, []);

  const redirectAfterLogin = useCallback(() => {
    // successfully logged in, redirect to a page in your application
    router.replace(props.redirect);

    userSession.refreshSession();
    userData.refreshUser();
  }, [router]);

  useEffect(
    () =>
      hanko?.onAuthFlowCompleted(() => {
        redirectAfterLogin();
      }),
    [hanko, redirectAfterLogin]
  );

  useEffect(() => {
    register(hankoApi, {
      translations: { en, fr },
    }).catch((error) => {
      // handle error
    });
  }, []);

  return (
    <div className="hanko-profile">
      <hanko-auth lang={locale} />
    </div>
  );
}
