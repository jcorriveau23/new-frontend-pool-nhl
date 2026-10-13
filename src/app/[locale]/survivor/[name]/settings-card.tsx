"use client";

/*
The owner editing a running pool's settings.

The same five fields the pool was created under, and the same bounds, so this
is the creation form's schema minus the two fields a creation needs. What is
different is that people are already in and dates may already have been
settled, which closes two of the fields:

  - the cap cannot go below the number of people already in, or the pool would
    sit over its own maximum;
  - what a pick costs — the losses allowed, whether a missed pick costs one —
    is frozen once a date has been settled, because the strikes on the board
    were counted under the old rules and changing them now would rewrite them.

The backend enforces both. They are mirrored here so the owner sees a disabled
field and a reason instead of filling the form in and getting it refused.
*/

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useSession } from "@/context/useSessionData";
import { SurvivorPool } from "@/data/survivor/model";
import { hasSettledWeek } from "@/lib/survivor";
import {
  SURVIVOR_BOUNDS,
  SurvivorSettingsFormValues,
  buildSurvivorSettingsSchema,
  mergeSurvivorSettings,
  numberOrNull,
  toSurvivorSettingsFormValues,
} from "@/lib/survivor-settings-form";
import { updateSurvivorSettings } from "@/lib/survivor-api";

interface Props {
  pool: SurvivorPool;
  onPoolChange: (pool: SurvivorPool) => void;
}

export default function SettingsCard(props: Props) {
  const { pool, onPoolChange } = props;
  const t = useTranslations();
  const userSession = useSession();
  const [isSaving, setIsSaving] = React.useState(false);

  // The cap can come down, but not past the people already in.
  const minParticipants = Math.max(
    SURVIVOR_BOUNDS.maxParticipants.min,
    pool.participants.length,
  );
  const scoringLocked = hasSettledWeek(pool);

  // Rebuilt when the locale changes so the messages follow it, and memoised so
  // the resolver is not a new object on every render.
  const schema = React.useMemo(
    () => buildSurvivorSettingsSchema(t, minParticipants),
    [t, minParticipants],
  );

  const form = useForm<SurvivorSettingsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toSurvivorSettingsFormValues(pool.settings),
  });

  const onSubmit = async (values: SurvivorSettingsFormValues) => {
    setIsSaving(true);
    const res = await updateSurvivorSettings(
      pool.name,
      // Merged onto what the pool already has rather than built from the form:
      // the assistants and the league's team count are on no field here.
      mergeSurvivorSettings(pool.settings, values),
      userSession.info?.jwt,
    );
    setIsSaving(false);

    if (!res.ok) {
      toast.error(res.error, { duration: 5000 });
      return;
    }

    onPoolChange(res.data);
    // Settles the form on what was saved, so the button goes back to disabled.
    form.reset(toSurvivorSettingsFormValues(res.data.settings));
    toast.success(t("SurvivorSettingsSaved"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("PoolSettings")}</CardTitle>
        <CardDescription>{t("SurvivorSettingsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 text-left"
          >
            {scoringLocked ? (
              <Alert>
                <AlertDescription>
                  {t("SurvivorScoringLockedNote")}
                </AlertDescription>
              </Alert>
            ) : null}

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
                      min={minParticipants}
                      max={SURVIVOR_BOUNDS.maxParticipants.max}
                      disabled={isSaving}
                      onChange={(event) =>
                        field.onChange(numberOrNull(event.target.value))
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    {t("SurvivorMaxParticipantsEditDescription", {
                      count: pool.participants.length,
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
                      disabled={isSaving || scoringLocked}
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
                      disabled={isSaving || scoringLocked}
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
                      disabled={isSaving}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="publicPicks"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0">
                  <div className="space-y-1">
                    <FormLabel>{t("SurvivorPublicPicks")}</FormLabel>
                    <FormDescription>
                      {t("SurvivorPublicPicksDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSaving}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSaving || !form.formState.isDirty}
            >
              <Save className="size-4" />
              {t("Save")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
