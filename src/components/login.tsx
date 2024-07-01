import { useTranslations } from "next-intl";

import dynamic from "next/dynamic";
const HankoAuth = dynamic(() => import("@/components/hanko/hanko-auth"), {
  ssr: true,
});

interface Props {
  redirect: string;
}

export default function LoginForm(props: Props) {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-sm">
      <HankoAuth redirect={props.redirect} />
    </div>
  );
}
