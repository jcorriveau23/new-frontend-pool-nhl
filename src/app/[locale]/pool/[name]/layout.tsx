// The pool page itself is a client component, so the document title is set
// here instead. The route segment already holds the pool name, no fetch needed.
import { Metadata, ResolvingMetadata } from "next";

interface Props {
  params: Promise<{ name: string; locale: string }>;
  children: React.ReactNode;
}

// A pool invite is the link that actually gets shared, so it is the one that
// most needs a card naming the pool rather than the site.
const INVITES: Record<string, (pool: string) => string> = {
  en: (pool) => `Join the "${pool}" hockey pool on slapshot.xyz.`,
  fr: (pool) => `Rejoignez le pool de hockey « ${pool} » sur slapshot.xyz.`,
};

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { name, locale } = await props.params;
  // The [name] segment reaches this still percent-encoded, the same way it does
  // in `fetchPoolInfo`.
  const poolName = decodeURIComponent(name);
  const description = (INVITES[locale] ?? INVITES.en)(poolName);

  // `openGraph` is replaced wholesale by the nearest segment that declares it,
  // not merged field by field — so overriding the title here would silently
  // drop the card image the locale layout's `opengraph-image` contributes.
  // Carrying the parent's images forward keeps it.
  const images = (await parent).openGraph?.images ?? [];

  return {
    title: poolName,
    description,
    openGraph: { title: poolName, description, images },
    twitter: { title: poolName, description, images },
  };
}

export default function PoolLayout(props: Props) {
  return props.children;
}
