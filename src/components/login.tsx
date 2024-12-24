import dynamic from "next/dynamic";
const HankoAuth = dynamic(() => import("@/components/hanko/hanko-auth"), {
  ssr: true,
});

interface Props {
  redirect: string;
}

export default function LoginForm(props: Props) {
  return (
    <div className="mx-auto max-w-sm">
      <HankoAuth redirect={props.redirect} />
    </div>
  );
}
