// The pool page itself is a client component, so the document title is set
// here instead. The route segment already holds the pool name, no fetch needed.
import { Metadata } from "next";

interface Props {
  params: Promise<{ name: string }>;
  children: React.ReactNode;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { name } = await props.params;

  return { title: decodeURIComponent(name) };
}

export default function PoolLayout(props: Props) {
  return props.children;
}
