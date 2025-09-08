"use client"; //Only for NextJS App Router

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { register, Hanko } from "@teamhanko/hanko-elements";
import { useLocale } from "next-intl";
import { en } from "@teamhanko/hanko-elements/i18n/en";
import { fr } from "@teamhanko/hanko-elements/i18n/fr";
import "./hanko.css";

import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";

//@ts-expect-error, known environment variable type.
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
  console.log(hankoApi);
  useEffect(() => setHanko(new Hanko(hankoApi)), []);

  const redirectAfterLogin = useCallback(() => {
    // successfully logged in, redirect to a page in your application
    console.log(`Redirecting to ${props.redirect}`);
    router.replace(props.redirect);

    userSession.refreshSession();
    userData.refreshUser();
  }, [router]);

  useEffect(
    () =>
      hanko?.onSessionCreated(() => {
        console.log("Session successfully created.");
        redirectAfterLogin();
      }),
    [hanko, redirectAfterLogin]
  );

  useEffect(() => {
    register(hankoApi, {
      translations: { en, fr },
    }).catch((error: Error) => {
      // handle error
      console.log(`Could not loggin the user: ${error}`);
    });
  }, []);

  return (
    <div className="hanko-profile">
      <hanko-auth lang={locale} />
    </div>
  );
}
