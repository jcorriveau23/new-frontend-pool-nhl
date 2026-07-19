"use client";
import {
  CardTitle,
  CardDescription,
  CardHeader,
  CardContent,
  Card,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import * as React from "react";
import { DraftType, PoolSettings, PoolState } from "@/data/pool/model";
import { RadioGroupItem, RadioGroup } from "@/components/ui/radio-group";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm, type FieldPath } from "react-hook-form";
import { Checkbox } from "./ui/checkbox";
import { useRouter } from "@/i18n/routing";
import { useSession } from "@/context/useSessionData";
import { toast } from "sonner";
import InformationIcon from "./information-box";
import { useSearchParams } from "next/navigation";

enum PoolType {
  STANDARD = "Standard",
  DYNASTY = "Dynasty",
}

interface Props {
  // When the oldPoolSettings is not filled (not null), it means we are in a context
  // of pool creation. else it is a pool update.
  poolName: string;
  poolStatus: PoolState | null;
  oldPoolSettings: PoolSettings | null;
}

export const POOL_NAME_MIN_LENGTH = 5;
export const POOL_NAME_MAX_LENGTH = 16;

export default function PoolSettingsComponent(props: Props) {
  const t = useTranslations();
  const userSession = useSession();

  const router = useRouter();
  const searchParams = useSearchParams();

  const DISABLE_OPTIONS =
    props.poolStatus !== null && props.poolStatus !== PoolState.Created;

  // The validation and default values of the form for the pool settings are listed here.
  // 1) General Settings
  const DEFAULT_POOL_NAME = props.poolName ?? "";

  const DEFAULT_POOLER_NUMBER = props.oldPoolSettings?.number_poolers ?? 6;
  const MIN_POOLER_NUMBER = 2;
  const MAX_POOLER_NUMBER = 24;

  const DEFAULT_POOL_TYPE = props.oldPoolSettings?.dynasty_settings
    ? PoolType.DYNASTY
    : PoolType.STANDARD;

  const DEFAULT_DRAFT_TYPE =
    props.oldPoolSettings?.draft_type ?? DraftType.SERPENTINE;

  // 2) Player Settings
  // Forwards
  const DEFAULT_NUMBER_FORWARDS = props.oldPoolSettings?.number_forwards ?? 9;
  const NUMBER_FORWARDS_MIN_VALUE = 3;
  const NUMBER_FORWARDS_MAX_VALUE = 15;

  // Defenders
  const DEFAULT_NUMBER_DEFENDERS = props.oldPoolSettings?.number_defenders ?? 4;
  const NUMBER_DEFENDERS_MIN_VALUE = 2;
  const NUMBER_DEFENDERS_MAX_VALUE = 9;

  // Goalies
  const DEFAULT_NUMBER_GOALIES = props.oldPoolSettings?.number_goalies ?? 2;
  const NUMBER_GOALIES_MIN_VALUE = 1;
  const NUMBER_GOALIES_MAX_VALUE = 5;

  // Reservists
  const DEFAULT_NUMBER_RESERVISTS =
    props.oldPoolSettings?.number_reservists ?? 0;
  const NUMBER_RESERVISTS_MIN_VALUE = 0;
  const NUMBER_RESERVISTS_MAX_VALUE = 10;

  // Ignore x worst players
  const DEFAULT_IGNORE_WORST_PLAYERS =
    props.oldPoolSettings !== null &&
    props.oldPoolSettings.ignore_x_worst_players !== null;

  const DEFAULT_NUMBER_WORST_FORWARDS_TO_IGNORE =
    props.oldPoolSettings?.ignore_x_worst_players?.forwards ?? 0;
  const NUMBER_WORST_FORWARDS_TO_IGNORE_MIN_VALUE = 0;
  const NUMBER_WORST_FORWARDS_TO_IGNORE_MAX_VALUE = 5;

  const DEFAULT_NUMBER_WORST_DEFENDERS_TO_IGNORE =
    props.oldPoolSettings?.ignore_x_worst_players?.defense ?? 0;
  const NUMBER_WORST_DEFENDERS_TO_IGNORE_MIN_VALUE = 0;
  const NUMBER_WORST_DEFENDERS_TO_IGNORE_MAX_VALUE = 5;

  const DEFAULT_NUMBER_WORST_GOALIES_TO_IGNORE =
    props.oldPoolSettings?.ignore_x_worst_players?.goalies ?? 0;
  const NUMBER_WORST_GOALIES_TO_IGNORE_MIN_VALUE = 0;
  const NUMBER_WORST_GOALIES_TO_IGNORE_MAX_VALUE = 5;

  // 3) Points Settings
  const POINTS_MIN_VALUE = 0;
  const POINTS_MAX_VALUE = 100.0;
  const DEFAULT_POINTS_VALUE = 1.0;
  // Forwards
  const DEFAULT_FORWARDS_POINTS_PER_GOALS =
    props.oldPoolSettings?.forwards_settings.points_per_goals ??
    DEFAULT_POINTS_VALUE;
  const DEFAULT_FORWARDS_POINTS_PER_ASSITS =
    props.oldPoolSettings?.forwards_settings.points_per_assists ??
    DEFAULT_POINTS_VALUE;
  const DEFAULT_FORWARDS_POINTS_PER_HATTRICKS =
    props.oldPoolSettings?.forwards_settings.points_per_hattricks ??
    DEFAULT_POINTS_VALUE;
  const DEFAULT_FORWARDS_POINTS_PER_SHOOTOUT_GOALS =
    props.oldPoolSettings?.forwards_settings.points_per_shootout_goals ??
    DEFAULT_POINTS_VALUE;
  // Defense
  const DEFAULT_DEFENDERS_POINTS_PER_GOALS =
    props.oldPoolSettings?.defense_settings.points_per_goals ??
    DEFAULT_POINTS_VALUE;
  const DEFAULT_DEFENDERS_POINTS_PER_ASSITS =
    props.oldPoolSettings?.defense_settings.points_per_assists ??
    DEFAULT_POINTS_VALUE;
  const DEFAULT_DEFENDERS_POINTS_PER_HATTRICKS =
    props.oldPoolSettings?.defense_settings.points_per_hattricks ??
    DEFAULT_POINTS_VALUE;
  const DEFAULT_DEFENDERS_POINTS_PER_SHOOTOUT_GOALS =
    props.oldPoolSettings?.defense_settings.points_per_shootout_goals ??
    DEFAULT_POINTS_VALUE;
  // Goalies
  const DEFAULT_GOALIES_POINTS_PER_WINS =
    props.oldPoolSettings?.goalies_settings.points_per_wins ??
    DEFAULT_POINTS_VALUE;
  const DEFAULT_GOALIES_POINTS_PER_OVERTIME_LOSSES =
    props.oldPoolSettings?.goalies_settings.points_per_overtimes ??
    DEFAULT_POINTS_VALUE;
  const DEFAULT_GOALIES_POINTS_PER_SHUTOUT =
    props.oldPoolSettings?.goalies_settings.points_per_shutouts ??
    DEFAULT_POINTS_VALUE;
  const DEFAULT_GOALIES_POINTS_PER_GOALS =
    props.oldPoolSettings?.goalies_settings.points_per_goals ??
    DEFAULT_POINTS_VALUE;
  const DEFAULT_GOALIES_POINTS_PER_ASSITS =
    props.oldPoolSettings?.goalies_settings.points_per_assists ??
    DEFAULT_POINTS_VALUE;

  // 4) Dynasty Settings
  const DEFAULT_TRADABLE_DRAFT_PICKS =
    props.oldPoolSettings?.dynasty_settings?.tradable_picks ?? 5;
  const TRADABLE_DRAFT_PICKS_MIN_VALUE = 0;
  const TRADABLE_DRAFT_PICKS_MAX_VALUE = 7;

  const DEFAULT_NUMBER_OF_PLAYERS_TO_PROTECT =
    props.oldPoolSettings?.dynasty_settings
      ?.next_season_number_players_protected ?? 10;
  const NUMBER_OF_PLAYERS_TO_PROTECT_MIN_VALUE = 5;
  const NUMBER_OF_PLAYERS_TO_PROTECT_MAX_VALUE = 15;

  const [showDynastySettings, setShowDynastySettings] = React.useState(
    DEFAULT_POOL_TYPE === PoolType.DYNASTY
  );
  const [showIgnorePlayers, setShowIgnorePlayers] = React.useState(
    DEFAULT_IGNORE_WORST_PLAYERS
  );
  const isCreationContext = (): boolean => props.oldPoolSettings === null;

  // Define the schema
  const formSchema = z.object({
    name: z
      .string()
      .min(POOL_NAME_MIN_LENGTH, {
        error: t("PoolNameMinLenghtValidation", {
          value: POOL_NAME_MIN_LENGTH,
        }),
      })
      .max(POOL_NAME_MAX_LENGTH, {
        error: t("PoolNameMaxLenghtValidation", {
          value: POOL_NAME_MAX_LENGTH,
        }),
      }),
    numberOfPooler: z
      .number()
      .min(MIN_POOLER_NUMBER, {
        error: t("NumberOfPoolerMinLengthValidation", {
          value: MIN_POOLER_NUMBER,
        }),
      })
      .max(MAX_POOLER_NUMBER, {
        error: t("NumberOfPoolerMaxLengthValidation", {
          value: MAX_POOLER_NUMBER,
        }),
      }),
    typeOfPool: z.enum([PoolType.STANDARD, PoolType.DYNASTY]),
    draftType: z.enum([DraftType.SERPENTINE, DraftType.STANDARD]),
    // Number of player per types
    numberOfForwards: z
      .number()
      .min(NUMBER_FORWARDS_MIN_VALUE, {
        error: t("NumberOfForwardsMinValidation", {
          value: NUMBER_FORWARDS_MIN_VALUE,
        }),
      })
      .max(NUMBER_FORWARDS_MAX_VALUE, {
        error: t("NumberOfForwardsMaxValidation", {
          value: NUMBER_FORWARDS_MAX_VALUE,
        }),
      }),
    numberOfDefenders: z
      .number()
      .min(NUMBER_DEFENDERS_MIN_VALUE, {
        error: t("NumberOfDefendersMinValidation", {
          value: NUMBER_DEFENDERS_MIN_VALUE,
        }),
      })
      .max(NUMBER_DEFENDERS_MAX_VALUE, {
        error: t("NumberOfDefendersMaxValidation", {
          value: NUMBER_DEFENDERS_MAX_VALUE,
        }),
      }),
    numberOfGoalies: z
      .number()
      .min(NUMBER_GOALIES_MIN_VALUE, {
        error: t("NumberOfGoaliesMinValidation", {
          value: NUMBER_GOALIES_MIN_VALUE,
        }),
      })
      .max(NUMBER_GOALIES_MAX_VALUE, {
        error: t("NumberOfGoaliesMaxValidation", {
          value: NUMBER_GOALIES_MAX_VALUE,
        }),
      }),
    numberOfReservists: z
      .number()
      .min(NUMBER_RESERVISTS_MIN_VALUE, {
        error: t("NumberOfReservistsMinValidation", {
          value: NUMBER_RESERVISTS_MIN_VALUE,
        }),
      })
      .max(NUMBER_RESERVISTS_MAX_VALUE, {
        error: t("NumberOfReservistsMaxValidation", {
          value: NUMBER_RESERVISTS_MAX_VALUE,
        }),
      }),
    // Number of players to ignore points.
    numberOfWorstForwardsToIgnore: z
      .number()
      .min(NUMBER_WORST_FORWARDS_TO_IGNORE_MIN_VALUE, {
        error: t("NumberOfWorstForwardsToIgnoreMinValidation", {
          value: NUMBER_WORST_FORWARDS_TO_IGNORE_MIN_VALUE,
        }),
      })
      .max(NUMBER_WORST_FORWARDS_TO_IGNORE_MAX_VALUE, {
        error: t("NumberOfWorstForwardsToIgnoreMaxValidation", {
          value: NUMBER_WORST_FORWARDS_TO_IGNORE_MAX_VALUE,
        }),
      }),
    numberOfWorstDefendersToIgnore: z
      .number()
      .min(NUMBER_WORST_DEFENDERS_TO_IGNORE_MIN_VALUE, {
        error: t("NumberOfWorstDefendersToIgnoreMinValidation", {
          value: NUMBER_WORST_DEFENDERS_TO_IGNORE_MIN_VALUE,
        }),
      })
      .max(NUMBER_WORST_DEFENDERS_TO_IGNORE_MAX_VALUE, {
        error: t("NumberOfWorstDefendersToIgnoreMaxValidation", {
          value: NUMBER_WORST_DEFENDERS_TO_IGNORE_MAX_VALUE,
        }),
      }),
    numberOfWorstGoaliesToIgnore: z
      .number()
      .min(NUMBER_WORST_GOALIES_TO_IGNORE_MIN_VALUE, {
        error: t("NumberOfWorstGoaliesToIgnoreMinValidation", {
          value: NUMBER_WORST_GOALIES_TO_IGNORE_MIN_VALUE,
        }),
      })
      .max(NUMBER_WORST_GOALIES_TO_IGNORE_MAX_VALUE, {
        error: t("NumberOfWorstGoaliesToIgnoreMaxValidation", {
          value: NUMBER_WORST_GOALIES_TO_IGNORE_MAX_VALUE,
        }),
      }),
    //Forwards
    forwardsPointsPerGoals: z
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE),
    forwardsPointsPerAssists: z
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE),
    forwardsPointsPerHatTricks: z
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE),
    forwardsPointsPerShootOutGoals: z
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE),
    // Defenders
    defendersPointsPerGoals: z
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE),
    defendersPointsPerAssists: z
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE),
    defendersPointsPerHatTricks: z
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE),
    defendersPointsPerShootOutGoals: z
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE),
    // Goalies
    goaliesPointsPerGoals: z
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE),
    goaliesPointsPerAssists: z
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE),
    goaliesPointsPerWins: z
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE),
    goaliesPointsPerOvertimeLosses: z
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE),
    goaliesPointsPerShutout: z
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE),
    tradableDraftPicks: z
      .number()
      .min(TRADABLE_DRAFT_PICKS_MIN_VALUE)
      .max(TRADABLE_DRAFT_PICKS_MAX_VALUE),
    numberOfPlayersToProtect: z
      .number()
      .min(NUMBER_OF_PLAYERS_TO_PROTECT_MIN_VALUE)
      .max(NUMBER_OF_PLAYERS_TO_PROTECT_MAX_VALUE),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: DEFAULT_POOL_NAME,
      numberOfPooler: DEFAULT_POOLER_NUMBER,
      typeOfPool: DEFAULT_POOL_TYPE,
      draftType: DEFAULT_DRAFT_TYPE,
      numberOfForwards: DEFAULT_NUMBER_FORWARDS,
      numberOfDefenders: DEFAULT_NUMBER_DEFENDERS,
      numberOfGoalies: DEFAULT_NUMBER_GOALIES,
      numberOfReservists: DEFAULT_NUMBER_RESERVISTS,
      numberOfWorstForwardsToIgnore: DEFAULT_NUMBER_WORST_FORWARDS_TO_IGNORE,
      numberOfWorstDefendersToIgnore: DEFAULT_NUMBER_WORST_DEFENDERS_TO_IGNORE,
      numberOfWorstGoaliesToIgnore: DEFAULT_NUMBER_WORST_GOALIES_TO_IGNORE,
      forwardsPointsPerGoals: DEFAULT_FORWARDS_POINTS_PER_GOALS,
      forwardsPointsPerAssists: DEFAULT_FORWARDS_POINTS_PER_ASSITS,
      forwardsPointsPerHatTricks: DEFAULT_FORWARDS_POINTS_PER_HATTRICKS,
      forwardsPointsPerShootOutGoals:
        DEFAULT_FORWARDS_POINTS_PER_SHOOTOUT_GOALS,
      defendersPointsPerGoals: DEFAULT_DEFENDERS_POINTS_PER_GOALS,
      defendersPointsPerAssists: DEFAULT_DEFENDERS_POINTS_PER_ASSITS,
      defendersPointsPerHatTricks: DEFAULT_DEFENDERS_POINTS_PER_HATTRICKS,
      defendersPointsPerShootOutGoals:
        DEFAULT_DEFENDERS_POINTS_PER_SHOOTOUT_GOALS,
      goaliesPointsPerGoals: DEFAULT_GOALIES_POINTS_PER_GOALS,
      goaliesPointsPerAssists: DEFAULT_GOALIES_POINTS_PER_ASSITS,
      goaliesPointsPerWins: DEFAULT_GOALIES_POINTS_PER_WINS,
      goaliesPointsPerOvertimeLosses:
        DEFAULT_GOALIES_POINTS_PER_OVERTIME_LOSSES,
      goaliesPointsPerShutout: DEFAULT_GOALIES_POINTS_PER_SHUTOUT,
      tradableDraftPicks: DEFAULT_TRADABLE_DRAFT_PICKS,
      numberOfPlayersToProtect: DEFAULT_NUMBER_OF_PLAYERS_TO_PROTECT,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const poolSettings = {
      pool_name: values.name ?? DEFAULT_POOL_NAME,
      settings: {
        number_poolers: values.numberOfPooler,
        draft_type: values.draftType,
        assistants: [],
        number_forwards: values.numberOfForwards,
        number_defenders: values.numberOfDefenders,
        number_goalies: values.numberOfGoalies,
        number_reservists: values.numberOfReservists,
        roster_modification_date: [],
        forwards_settings: {
          points_per_goals: values.forwardsPointsPerGoals,
          points_per_assists: values.forwardsPointsPerAssists,
          points_per_hattricks: values.forwardsPointsPerHatTricks,
          points_per_shootout_goals: values.forwardsPointsPerShootOutGoals,
        },
        defense_settings: {
          points_per_goals: values.defendersPointsPerGoals,
          points_per_assists: values.defendersPointsPerAssists,
          points_per_hattricks: values.defendersPointsPerHatTricks,
          points_per_shootout_goals: values.defendersPointsPerShootOutGoals,
        },
        goalies_settings: {
          points_per_wins: values.goaliesPointsPerWins,
          points_per_shutouts: values.goaliesPointsPerShutout,
          points_per_overtimes: values.goaliesPointsPerOvertimeLosses,
          points_per_goals: values.goaliesPointsPerGoals,
          points_per_assists: values.goaliesPointsPerAssists,
        },
        ignore_x_worst_players: showIgnorePlayers
          ? {
              forwards: values.numberOfWorstForwardsToIgnore,
              defense: values.numberOfWorstDefendersToIgnore,
              goalies: values.numberOfWorstGoaliesToIgnore,
            }
          : null,
        dynasty_settings: showDynastySettings
          ? {
              next_season_number_players_protected:
                values.numberOfPlayersToProtect,
              tradable_picks: values.tradableDraftPicks,
            }
          : null,
      },
    };

    if (isCreationContext()) {
      const res = await fetch("/api-rust/create-pool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userSession.info?.jwt}`,
        },
        body: JSON.stringify(poolSettings),
      });

      if (!res.ok) {
        const error = await res.text();
        toast.error(t("CouldNotGeneratePoolError", {
            name: values.name,
            error: error,
          }), { duration: 2000 });
      }
      router.push(`/pool/${values.name}?${searchParams.toString()}`);
    } else {
      const res = await fetch("/api-rust/update-pool-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userSession.info?.jwt}`,
        },
        body: JSON.stringify(poolSettings),
      });

      if (!res.ok) {
        const error = await res.text();
        toast.error(t("CouldNotUpdatePoolError", {
            name: values.name,
            error: error,
          }), { duration: 2000 });
      }
    }
  };

  type FormValues = z.infer<typeof formSchema>;

  const NumberField = (
    fieldName: FieldPath<FormValues>,
    label: string,
    min: number,
    max: number,
    info?: string
  ) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-1.5">
            <FormLabel>{label}</FormLabel>
            {info ? <InformationIcon text={info} /> : null}
          </div>
          <FormControl>
            <Input
              {...field}
              type="number"
              min={min}
              max={max}
              onChange={(e) => field.onChange(Number(e.target.value) || null)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const RadioOption = (
    id: string,
    value: string,
    label: string,
    info?: string
  ) => (
    <div className="flex items-center gap-2">
      <RadioGroupItem value={value} id={id} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      {info ? <InformationIcon text={info} /> : null}
    </div>
  );

  const GeneralSettings = () => (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("GeneralSettings")}</CardTitle>
        {isCreationContext() ? (
          <CardDescription>{t("GeneralSettingsDescription")}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            disabled={!isCreationContext()}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PoolName")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("PoolName")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {NumberField(
            "numberOfPooler",
            t("NumberPooler"),
            MIN_POOLER_NUMBER,
            MAX_POOLER_NUMBER
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="typeOfPool"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PoolType")}</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setShowDynastySettings(value === PoolType.DYNASTY);
                    }}
                    className="flex min-h-9 flex-wrap items-center gap-x-6 gap-y-2"
                  >
                    {RadioOption(
                      "pool-type-standard",
                      PoolType.STANDARD,
                      "Standard"
                    )}
                    {RadioOption(
                      "pool-type-dynasty",
                      PoolType.DYNASTY,
                      t("Dynasty"),
                      t("DynastyPoolTypeDescription")
                    )}
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="draftType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("DraftType")}</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex min-h-9 flex-wrap items-center gap-x-6 gap-y-2"
                  >
                    {RadioOption(
                      "draft-type-standard",
                      DraftType.STANDARD,
                      "Standard"
                    )}
                    {RadioOption(
                      "draft-type-serpentine",
                      DraftType.SERPENTINE,
                      t("Serpentine"),
                      t("SerpentinDescription")
                    )}
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        {showDynastySettings ? (
          <div className="grid gap-4 rounded-lg border bg-muted/50 p-4 sm:grid-cols-2">
            {NumberField(
              "tradableDraftPicks",
              t("TradableDraftPicks"),
              TRADABLE_DRAFT_PICKS_MIN_VALUE,
              TRADABLE_DRAFT_PICKS_MAX_VALUE,
              t("TradablePicksDescription")
            )}
            {NumberField(
              "numberOfPlayersToProtect",
              t("NumberOfProtectedPlayers"),
              NUMBER_OF_PLAYERS_TO_PROTECT_MIN_VALUE,
              NUMBER_OF_PLAYERS_TO_PROTECT_MAX_VALUE,
              t("NumberOfPlayersToProtectDescription")
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const PlayerSettings = () => (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("PlayerSettings")}</CardTitle>
        {isCreationContext() ? (
          <CardDescription>{t("PlayerSettingsDescription")}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {NumberField(
            "numberOfForwards",
            t("NumberOfForwards"),
            NUMBER_FORWARDS_MIN_VALUE,
            NUMBER_FORWARDS_MAX_VALUE
          )}
          {NumberField(
            "numberOfDefenders",
            t("NumberOfDefenders"),
            NUMBER_DEFENDERS_MIN_VALUE,
            NUMBER_DEFENDERS_MAX_VALUE
          )}
          {NumberField(
            "numberOfGoalies",
            t("NumberOfGoalies"),
            NUMBER_GOALIES_MIN_VALUE,
            NUMBER_GOALIES_MAX_VALUE
          )}
          {NumberField(
            "numberOfReservists",
            t("NumberOfReservists"),
            NUMBER_RESERVISTS_MIN_VALUE,
            NUMBER_RESERVISTS_MAX_VALUE
          )}
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="ignore-players"
            defaultChecked={DEFAULT_IGNORE_WORST_PLAYERS}
            onCheckedChange={(checkedState) => {
              setShowIgnorePlayers(checkedState as boolean);
            }}
          />
          <Label htmlFor="ignore-players" className="font-normal">
            {t("IgnoreWorstPlayers")}
          </Label>
          <InformationIcon text={t("IgnoreWorstPlayersDescription")} />
        </div>
        {showIgnorePlayers ? (
          <div className="grid grid-cols-3 gap-4 rounded-lg border bg-muted/50 p-4">
            {NumberField(
              "numberOfWorstForwardsToIgnore",
              t("Forwards"),
              NUMBER_WORST_FORWARDS_TO_IGNORE_MIN_VALUE,
              NUMBER_WORST_FORWARDS_TO_IGNORE_MAX_VALUE
            )}
            {NumberField(
              "numberOfWorstDefendersToIgnore",
              t("Defense"),
              NUMBER_WORST_DEFENDERS_TO_IGNORE_MIN_VALUE,
              NUMBER_WORST_DEFENDERS_TO_IGNORE_MAX_VALUE
            )}
            {NumberField(
              "numberOfWorstGoaliesToIgnore",
              t("Goalies"),
              NUMBER_WORST_GOALIES_TO_IGNORE_MIN_VALUE,
              NUMBER_WORST_GOALIES_TO_IGNORE_MAX_VALUE
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const PointsField = (fieldName: FieldPath<FormValues>, label: string) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0">
          <FormLabel className="font-normal text-muted-foreground">
            {t(label)}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              className="h-8 w-20 text-right"
              step="any"
              type="number"
              min={POINTS_MIN_VALUE}
              max={POINTS_MAX_VALUE}
              onChange={(e) => field.onChange(Number(e.target.value) || null)}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );

  const PointsGroup = (title: string, fields: React.ReactNode) => (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {fields}
    </div>
  );

  const PointsSettings = () => (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("PointsSettings")}</CardTitle>
        {isCreationContext() ? (
          <CardDescription>{t("PontsSettingsDescription")}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {PointsGroup(
            t("Forwards"),
            <>
              {PointsField("forwardsPointsPerGoals", "Goals")}
              {PointsField("forwardsPointsPerAssists", "Assists")}
              {PointsField("forwardsPointsPerHatTricks", "HatTricks")}
              {PointsField("forwardsPointsPerShootOutGoals", "ShootoutGoals")}
            </>
          )}
          {PointsGroup(
            t("Defense"),
            <>
              {PointsField("defendersPointsPerGoals", "Goals")}
              {PointsField("defendersPointsPerAssists", "Assists")}
              {PointsField("defendersPointsPerHatTricks", "HatTricks")}
              {PointsField("defendersPointsPerShootOutGoals", "ShootoutGoals")}
            </>
          )}
          {PointsGroup(
            t("Goalies"),
            <>
              {PointsField("goaliesPointsPerWins", "Wins")}
              {PointsField("goaliesPointsPerOvertimeLosses", "OvertimeLosses")}
              {PointsField("goaliesPointsPerShutout", "Shutouts")}
              {PointsField("goaliesPointsPerGoals", "Goals")}
              {PointsField("goaliesPointsPerAssists", "Assists")}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <fieldset
          disabled={DISABLE_OPTIONS}
          className="mx-auto min-w-0 max-w-4xl space-y-4 text-left"
        >
          {GeneralSettings()}
          {PlayerSettings()}
          {PointsSettings()}
          {DISABLE_OPTIONS ? null : (
            <div className="flex justify-end">
              <Button type="submit" className="w-full sm:w-auto sm:px-8">
                {props.oldPoolSettings ? t("Update") : t("Create")}
              </Button>
            </div>
          )}
        </fieldset>
      </form>
    </Form>
  );
}
