import Image from "next/image";
import { Link } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, ArrowLeftRight, BarChart3, Radio } from "lucide-react";

export default function Home() {
  const locale = useLocale();

  setRequestLocale(locale);
  const t = useTranslations();

  const features = [
    {
      icon: Radio,
      title: t("FeatureDraftTitle"),
      description: t("FeatureDraftDescription"),
    },
    {
      icon: BarChart3,
      title: t("FeatureStatsTitle"),
      description: t("FeatureStatsDescription"),
    },
    {
      icon: ArrowLeftRight,
      title: t("FeatureDynastyTitle"),
      description: t("FeatureDynastyDescription"),
    },
  ];

  return (
    <main className="flex flex-col gap-16 py-8">
      <section className="flex flex-col items-center gap-6 px-4 text-center">
        <Image
          src="/logo.png"
          alt="slapshot.xyz"
          width={512}
          height={512}
          className="h-40 w-auto sm:h-52"
          priority
        />
        <Badge variant="secondary">{t("FreeForever")}</Badge>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {t("ManagePool")}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg text-balance">
          {t("AppDescription")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href={`/create-pool`} />}
          >
            {t("HeroGetStarted")}
            <ArrowRight />
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/pool/william`} />}
          >
            {t("HeroSeeDemo")}
          </Button>
        </div>
      </section>
      <section className="grid gap-4 px-4 sm:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-lg">
                <feature.icon className="size-5" />
              </div>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </main>
  );
}
