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

  const steps = [
    {
      title: t("StepCreateTitle"),
      description: t("StepCreateDescription"),
    },
    {
      title: t("StepInviteTitle"),
      description: t("StepInviteDescription"),
    },
    {
      title: t("StepFollowTitle"),
      description: t("StepFollowDescription"),
    },
  ];

  return (
    <main className="flex flex-col gap-16 pb-8 sm:gap-24">
      <section className="relative isolate overflow-hidden rounded-3xl border">
        <div
          aria-hidden
          className="from-primary/12 via-background to-background absolute inset-0 -z-10 bg-gradient-to-b"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[44px_44px] opacity-70 [mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent)]"
        />
        <div className="flex flex-col items-center gap-5 px-5 py-12 text-center sm:px-10 sm:py-16">
          <div className="relative">
            <div
              aria-hidden
              className="bg-primary/25 absolute inset-4 -z-10 rounded-full blur-3xl"
            />
            <Image
              src="/logo.png"
              alt="slapshot.xyz"
              width={512}
              height={512}
              className="h-24 w-auto sm:h-28"
              priority
            />
          </div>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <span aria-hidden className="bg-success size-1.5 rounded-full" />
            {t("FreeForever")}
          </Badge>
          <h1 className="from-foreground to-foreground/70 max-w-3xl bg-gradient-to-b bg-clip-text text-4xl font-bold tracking-tight text-balance text-transparent sm:text-5xl md:text-6xl">
            {t("ManagePool")}
          </h1>
          <p className="text-muted-foreground max-w-xl text-base text-pretty sm:text-lg">
            {t("AppDescription")}
          </p>
          <div className="mt-1 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link href={`/create-pool`} />}
            >
              {t("HeroGetStarted")}
              <ArrowRight />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link href={`/pool/william`} />}
            >
              {t("HeroSeeDemo")}
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            {t("HeroBrowseHint")}{" "}
            <Link
              href="/pools"
              className="text-foreground font-medium underline underline-offset-4"
            >
              {t("HeroBrowsePools")}
            </Link>
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
            {t("FeaturesEyebrow")}
          </p>
          <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            {t("FeaturesTitle")}
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group hover:border-primary/40 transition-colors"
            >
              <CardHeader className="gap-1.5 space-y-0">
                <div className="bg-primary/10 text-primary ring-primary/15 group-hover:bg-primary group-hover:text-primary-foreground mb-3 flex size-11 items-center justify-center rounded-xl ring-1 transition-colors">
                  <feature.icon className="size-5" />
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <CardDescription className="text-pretty">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
            {t("StepsEyebrow")}
          </p>
          <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            {t("StepsTitle")}
          </h2>
        </div>
        <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  {index + 1}
                </span>
                <span aria-hidden className="bg-border h-px flex-1" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-semibold tracking-tight">{step.title}</h3>
                <p className="text-muted-foreground text-sm text-pretty">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="from-primary/10 relative isolate overflow-hidden rounded-3xl border bg-gradient-to-br to-transparent px-6 py-10 text-center sm:px-10 sm:py-14">
        <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          {t("CtaTitle")}
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-pretty">
          {t("CtaDescription")}
        </p>
        <Button
          size="lg"
          className="mt-6"
          nativeButton={false}
          render={<Link href={`/create-pool`} />}
        >
          {t("HeroGetStarted")}
          <ArrowRight />
        </Button>
      </section>
    </main>
  );
}
