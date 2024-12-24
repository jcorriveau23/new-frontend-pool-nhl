"use client";

import { useEffect } from "react";
import { register } from "@teamhanko/hanko-elements";
import { useLocale } from "next-intl";
import { en } from "@teamhanko/hanko-elements/i18n/en";
import { fr } from "@teamhanko/hanko-elements/i18n/fr";
import "./hanko.css";

//@ts-expect-error, known environment variable type.
const hankoApi: string = process.env.NEXT_PUBLIC_HANKO_API_URL;

export default function HankoProfile() {
  const locale = useLocale();

  useEffect(() => {
    register(hankoApi, { translations: { en, fr } }).catch((error: unknown) => {
      // handle error
      console.log(`Error occured when registring to hanko api, ${error}`);
    });
  }, []);

  return (
    <div className="hanko-profile">
      {/*@ts-expect-error, no control on component naming here.*/}
      <hanko-profile lang={locale} />
    </div>
  );
}
