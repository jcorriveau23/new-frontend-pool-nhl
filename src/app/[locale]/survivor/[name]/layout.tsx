// The survivor pool page is a client component, so the document title is set
// here instead. The route segment already holds the pool name, no fetch needed.
// Mirrors the roster pool's layout, including why the parent's card image is
// carried forward.
import { Metadata, ResolvingMetadata } from "next";

interface Props {
  params: Promise<{ name: string; locale: string }>;
  children: React.ReactNode;
}

// The invite is the link that actually gets shared, and a survivor pool is
// shared far more widely than a roster pool — it is built for hundreds.
const INVITES: Record<string, (pool: string) => string> = {
  en: (pool) =>
    `Join the "${pool}" survivor pool on slapshot.xyz. Pick a winner every Saturday; one wrong call and you are out.`,
  fr: (pool) =>
    `Rejoignez le pool survivant « ${pool} » sur slapshot.xyz. Choisissez un gagnant chaque samedi; une erreur et vous êtes éliminé.`,
};

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { name, locale } = await props.params;
  // The [name] segment reaches this still percent-encoded, the same way it does
  // in the pool page's fetch.
  const poolName = decodeURIComponent(name);
  const description = (INVITES[locale] ?? INVITES.en)(poolName);

  // `openGraph` is replaced wholesale by the nearest segment that declares it,
  // not merged field by field, so carrying the parent's images forward is what
  // keeps the card image the locale layout contributes.
  const images = (await parent).openGraph?.images ?? [];

  return {
    title: poolName,
    description,
    openGraph: { title: poolName, description, images },
    twitter: { title: poolName, description, images },
  };
}

export default function SurvivorLayout(props: Props) {
  return props.children;
}
