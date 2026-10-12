"use client"; //Only for NextJS App Router

import { useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import { register } from "@teamhanko/hanko-elements";
import { useLocale } from "next-intl";
import { en } from "@teamhanko/hanko-elements/i18n/en";
import { fr } from "@teamhanko/hanko-elements/i18n/fr";
import "./hanko.css";

import { getHanko } from "@/context/hanko";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";
import { getHankoApi } from "@/lib/env-variables";

const hankoApi = getHankoApi();

interface Props {
  redirect: string;
}

export default function HankoAuth(props: Props) {
  const router = useRouter();

  const locale = useLocale();
  const userSession = useSession();
  const userData = useUser();

  const redirectAfterLogin = useCallback(() => {
    // successfully logged in, redirect to a page in your application
    router.replace(props.redirect);

    userSession.refreshSession();
    userData.refreshUser();
  }, [router, userSession, userData, props.redirect]);

  useEffect(
    () =>
      getHanko().onSessionCreated(() => {
        redirectAfterLogin();
      }),
    [redirectAfterLogin],
  );

  useEffect(() => {
    register(hankoApi, {
      translations: { en, fr },
    }).catch((error: Error) => {
      console.error(`Could not log in the user: ${error}`);
    });
  }, []);

  return (
    <div className="hanko-profile">
      <hanko-auth lang={locale} />
    </div>
  );
}
