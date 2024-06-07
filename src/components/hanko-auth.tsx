"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "@/navigation";
import { register, Hanko } from "@teamhanko/hanko-elements";

//@ts-ignore
const hankoApi: string = process.env.NEXT_PUBLIC_HANKO_API_URL;

export default function HankoAuth() {
  console.log(hankoApi);
  const router = useRouter();

  const [hanko, setHanko] = useState<Hanko>();

  useEffect(() => {
    import("@teamhanko/hanko-elements").then(({ Hanko }) =>
      setHanko(new Hanko(hankoApi))
    );
  }, []);

  const redirectAfterLogin = useCallback(() => {
    // successfully logged in, redirect to a page in your application
    router.replace("/profile");
  }, [router]);

  useEffect(
    () =>
      hanko?.onAuthFlowCompleted(() => {
        redirectAfterLogin();
      }),
    [hanko, redirectAfterLogin]
  );

  useEffect(() => {
    register(hankoApi).catch((error) => {
      // handle error
    });
  }, []);

  return <hanko-auth />;
}
