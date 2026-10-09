"use client";

/*
The survivor pool creation page.

Short on purpose. A survivor pool has four settings against the roster pool's
forty, and the one that matters is how many people it holds — the whole point of
this pool type is that it scales to a few hundred.
*/

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import LoginForm from "@/components/login";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "@/i18n/routing";
import { useSession } from "@/context/useSessionData";
import {
  DEFAULT_SURVIVOR_FORM_VALUES,
  SURVIVOR_BOUNDS,
  SURVIVOR_PARTICIPANT_NAME_MAX_LENGTH,
  SURVIVOR_POOL_NAME_MAX_LENGTH,
  SurvivorFormValues,
  buildSurvivorFormSchema,
  numberOrNull,
  toSurvivorSettings,
} from "@/lib/survivor-settings-form";
import { createSurvivorPool } from "@/lib/survivor-api";

export default function CreateSurvivorPoolPage() {
  const t = useTranslations();
  const router = useRouter();
  const userSession = useSession();
  const [isCreating, setIsCreating] = React.useState(false);

  // Rebuilt when the locale changes so the messages follow it, and memoised so
  // the resolver is not a new object on every render.
  const schema = React.useMemo(() => buildSurvivorFormSchema(t), [t]);

  const form = useForm<SurvivorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_SURVIVOR_FORM_VALUES,
  });

  const onSubmit = async (values: SurvivorFormValues) => {
    setIsCreating(true);
    const res = await createSurvivorPool(
      {
        pool_name: values.poolName.trim(),
        settings: toSurvivorSettings(values),
        participant_name: values.participantName.trim(),
      },
      userSession.info?.jwt,
    );
    setIsCreating(false);

    if (!res.ok) {
      toast.error(res.error, { duration: 5000 });
      return;
    }

    toast.success(t("SurvivorPoolCreated", { pool: res.data.name }));
    router.push(`/survivor/${res.data.name}`);
  };

  if (!userSession.info?.jwt) {
    return (
      <main className="mx-auto max-w-2xl px-4">
        <PageTitle title={t("CreateSurvivorPool")} />
        <p>{t("MustBeConnectedToCreatePool")}</p>
        <LoginForm redirect="/create-survivor-pool" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4">
      <PageTitle
        title={t("CreateSurvivorPool")}
        subtitle={t("SurvivorPoolExplanation")}
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 text-left"
        >
          <Card>
            <CardHeader>
              <CardTitle>{t("PoolSettings")}</CardTitle>
              <CardDescription>
                {t("SurvivorSettingsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="poolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("PoolName")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={SURVIVOR_POOL_NAME_MAX_LENGTH}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="participantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("SurvivorYourName")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={SURVIVOR_PARTICIPANT_NAME_MAX_LENGTH}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("SurvivorYourNameDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("SurvivorMaxParticipants")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step={1}
                        min={SURVIVOR_BOUNDS.maxParticipants.min}
                        max={SURVIVOR_BOUNDS.maxParticipants.max}
                        onChange={(event) =>
                          field.onChange(numberOrNull(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {t("SurvivorMaxParticipantsDescription", {
                        max: SURVIVOR_BOUNDS.maxParticipants.max,
                      })}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="strikesAllowed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("SurvivorStrikesAllowedLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step={1}
                        min={SURVIVOR_BOUNDS.strikesAllowed.min}
                        max={SURVIVOR_BOUNDS.strikesAllowed.max}
                        onChange={(event) =>
                          field.onChange(numberOrNull(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {t("SurvivorStrikesAllowedDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="missedPickIsStrike"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0">
                    <div className="space-y-1">
                      <FormLabel>{t("SurvivorMissedPickIsStrike")}</FormLabel>
                      <FormDescription>
                        {t("SurvivorMissedPickIsStrikeDescription")}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowPickChange"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0">
                    <div className="space-y-1">
                      <FormLabel>{t("SurvivorAllowPickChange")}</FormLabel>
                      <FormDescription>
                        {t("SurvivorAllowPickChangeDescription")}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button type="submit" disabled={isCreating}>
            {t("CreateSurvivorPool")}
          </Button>
        </form>
      </Form>
    </main>
  );
}
