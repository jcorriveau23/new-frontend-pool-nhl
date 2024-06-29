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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Checkbox } from "./ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LucideAlertOctagon } from "lucide-react";
import { useRouter } from "@/navigation";
import { useSession } from "@/context/useSessionData";
import { toast } from "@/hooks/use-toast";

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
  const { jwt } = useSession();

  const router = useRouter();

  const DISABLE_OPTIONS =
    props.poolStatus !== null && props.poolStatus !== PoolState.Created;

  // The validation and default values of the form for the pool settings are listed here.
  // 1) General Settings
  const DEFAULT_POOL_NAME = props.poolName ?? "";

  const DEFAULT_POOLER_NUMBER = props.oldPoolSettings?.number_poolers ?? 6;
  const MIN_POOLER_NUMBER = 2;
  const MAX_POOLER_NUMBER = 18;

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
  const POINTS_MIN_VALUE = 0.5;
  const POINTS_MAX_VALUE = 100.0;
  const DEFAULT_POINTS_VALUE = 1.0;
  // Forwards
  const DEFAULT_FORWARDS_POINTS_PER_GOALS =
    props.oldPoolSettings?.forwards_settings.points_per_goals ?? 1;
  const DEFAULT_FORWARDS_POINTS_PER_ASSITS =
    props.oldPoolSettings?.forwards_settings.points_per_assists ?? 1;
  const DEFAULT_FORWARDS_POINTS_PER_HATTRICKS =
    props.oldPoolSettings?.forwards_settings.points_per_hattricks ?? 1;
  const DEFAULT_FORWARDS_POINTS_PER_SHOOTOUT_GOALS =
    props.oldPoolSettings?.forwards_settings.points_per_shootout_goals ?? 1;
  // Defense
  const DEFAULT_DEFENDERS_POINTS_PER_GOALS =
    props.oldPoolSettings?.defense_settings.points_per_goals ?? 1;
  const DEFAULT_DEFENDERS_POINTS_PER_ASSITS =
    props.oldPoolSettings?.defense_settings.points_per_assists ?? 1;
  const DEFAULT_DEFENDERS_POINTS_PER_HATTRICKS =
    props.oldPoolSettings?.defense_settings.points_per_hattricks ?? 1;
  const DEFAULT_DEFENDERS_POINTS_PER_SHOOTOUT_GOALS =
    props.oldPoolSettings?.defense_settings.points_per_shootout_goals ?? 1;
  // Goalies
  const DEFAULT_GOALIES_POINTS_PER_WINS =
    props.oldPoolSettings?.goalies_settings.points_per_wins ?? 1;
  const DEFAULT_GOALIES_POINTS_PER_OVERTIME_LOSSES =
    props.oldPoolSettings?.goalies_settings.points_per_overtimes ?? 1;
  const DEFAULT_GOALIES_POINTS_PER_SHUTOUT =
    props.oldPoolSettings?.goalies_settings.points_per_shutouts ?? 1;
  const DEFAULT_GOALIES_POINTS_PER_GOALS =
    props.oldPoolSettings?.goalies_settings.points_per_goals ?? 1;
  const DEFAULT_GOALIES_POINTS_PER_ASSITS =
    props.oldPoolSettings?.goalies_settings.points_per_assists ?? 1;

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
        message: t("PoolNameMinLenghtValidation", {
          value: POOL_NAME_MIN_LENGTH,
        }),
      })
      .max(POOL_NAME_MAX_LENGTH, {
        message: t("PoolNameMaxLenghtValidation", {
          value: POOL_NAME_MAX_LENGTH,
        }),
      })
      .default(DEFAULT_POOL_NAME),
    numberOfPooler: z.coerce
      .number()
      .min(MIN_POOLER_NUMBER, {
        message: t("NumberOfPoolerMinLengthValidation", {
          value: MIN_POOLER_NUMBER,
        }),
      })
      .max(MAX_POOLER_NUMBER, {
        message: t("NumberOfPoolerMaxLengthValidation", {
          value: MAX_POOLER_NUMBER,
        }),
      })
      .default(DEFAULT_POOLER_NUMBER),
    typeOfPool: z
      .enum([PoolType.STANDARD, PoolType.DYNASTY])
      .default(DEFAULT_POOL_TYPE),
    draftType: z
      .enum([DraftType.SERPENTINE, DraftType.STANDARD])
      .default(DEFAULT_DRAFT_TYPE),
    // Number of player per types
    numberOfForwards: z.coerce
      .number()
      .min(NUMBER_FORWARDS_MIN_VALUE, {
        message: t("NumberOfForwardsMinValidation", {
          value: NUMBER_FORWARDS_MIN_VALUE,
        }),
      })
      .max(NUMBER_FORWARDS_MAX_VALUE, {
        message: t("NumberOfForwardsMaxValidation", {
          value: NUMBER_FORWARDS_MAX_VALUE,
        }),
      })
      .default(DEFAULT_NUMBER_FORWARDS),
    numberOfDefenders: z.coerce
      .number()
      .min(NUMBER_DEFENDERS_MIN_VALUE, {
        message: t("NumberOfDefendersMinValidation", {
          value: NUMBER_DEFENDERS_MIN_VALUE,
        }),
      })
      .max(NUMBER_DEFENDERS_MAX_VALUE, {
        message: t("NumberOfDefendersMaxValidation", {
          value: NUMBER_DEFENDERS_MAX_VALUE,
        }),
      })
      .default(DEFAULT_NUMBER_DEFENDERS),
    numberOfGoalies: z.coerce
      .number()
      .min(NUMBER_GOALIES_MIN_VALUE, {
        message: t("NumberOfGoaliesMinValidation", {
          value: NUMBER_GOALIES_MIN_VALUE,
        }),
      })
      .max(NUMBER_GOALIES_MAX_VALUE, {
        message: t("NumberOfGoaliesMaxValidation", {
          value: NUMBER_GOALIES_MAX_VALUE,
        }),
      })
      .default(DEFAULT_NUMBER_GOALIES),
    numberOfReservists: z.coerce
      .number()
      .min(NUMBER_RESERVISTS_MIN_VALUE, {
        message: t("NumberOfReservistsMinValidation", {
          value: NUMBER_RESERVISTS_MIN_VALUE,
        }),
      })
      .max(NUMBER_RESERVISTS_MAX_VALUE, {
        message: t("NumberOfReservistsMaxValidation", {
          value: NUMBER_RESERVISTS_MAX_VALUE,
        }),
      })
      .default(DEFAULT_NUMBER_RESERVISTS),
    // Number of players to ignore points.
    numberOfWorstForwardsToIgnore: z.coerce
      .number()
      .min(NUMBER_WORST_FORWARDS_TO_IGNORE_MIN_VALUE, {
        message: t("NumberOfWorstForwardsToIgnoreMinValidation", {
          value: NUMBER_WORST_FORWARDS_TO_IGNORE_MIN_VALUE,
        }),
      })
      .max(NUMBER_WORST_FORWARDS_TO_IGNORE_MAX_VALUE, {
        message: t("NumberOfWorstForwardsToIgnoreMaxValidation", {
          value: NUMBER_WORST_FORWARDS_TO_IGNORE_MAX_VALUE,
        }),
      })
      .default(DEFAULT_NUMBER_WORST_FORWARDS_TO_IGNORE),
    numberOfWorstDefendersToIgnore: z.coerce
      .number()
      .min(NUMBER_WORST_DEFENDERS_TO_IGNORE_MIN_VALUE, {
        message: t("NumberOfWorstDefendersToIgnoreMinValidation", {
          value: NUMBER_WORST_DEFENDERS_TO_IGNORE_MIN_VALUE,
        }),
      })
      .max(NUMBER_WORST_DEFENDERS_TO_IGNORE_MAX_VALUE, {
        message: t("NumberOfWorstDefendersToIgnoreMaxValidation", {
          value: NUMBER_WORST_DEFENDERS_TO_IGNORE_MAX_VALUE,
        }),
      })
      .default(DEFAULT_NUMBER_WORST_DEFENDERS_TO_IGNORE),
    numberOfWorstGoaliesToIgnore: z.coerce
      .number()
      .min(NUMBER_WORST_GOALIES_TO_IGNORE_MIN_VALUE, {
        message: t("NumberOfWorstGoaliesToIgnoreMinValidation", {
          value: NUMBER_WORST_GOALIES_TO_IGNORE_MIN_VALUE,
        }),
      })
      .max(NUMBER_WORST_GOALIES_TO_IGNORE_MAX_VALUE, {
        message: t("NumberOfWorstGoaliesToIgnoreMaxValidation", {
          value: NUMBER_WORST_GOALIES_TO_IGNORE_MAX_VALUE,
        }),
      })
      .default(DEFAULT_NUMBER_WORST_GOALIES_TO_IGNORE),
    //Forwards
    forwardsPointsPerGoals: z.coerce
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE)
      .default(DEFAULT_POINTS_VALUE),
    forwardsPointsPerAssists: z.coerce
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE)
      .default(DEFAULT_POINTS_VALUE),
    forwardsPointsPerHatTricks: z.coerce
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE)
      .default(DEFAULT_POINTS_VALUE),
    forwardsPointsPerShootOutGoals: z.coerce
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE)
      .default(DEFAULT_POINTS_VALUE),
    // Defenders
    defendersPointsPerGoals: z.coerce
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE)
      .default(DEFAULT_POINTS_VALUE),
    defendersPointsPerAssists: z.coerce
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE)
      .default(DEFAULT_POINTS_VALUE),
    defendersPointsPerHatTricks: z.coerce
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE)
      .default(DEFAULT_POINTS_VALUE),
    defendersPointsPerShootOutGoals: z.coerce
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE)
      .default(DEFAULT_POINTS_VALUE),
    // Goalies
    goaliesPointsPerGoals: z.coerce
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE)
      .default(DEFAULT_POINTS_VALUE),
    goaliesPointsPerAssists: z.coerce
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE)
      .default(DEFAULT_POINTS_VALUE),
    goaliesPointsPerWins: z.coerce
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE)
      .default(DEFAULT_POINTS_VALUE),
    goaliesPointsPerOvertimeLosses: z.coerce
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE)
      .default(DEFAULT_POINTS_VALUE),
    goaliesPointsPerShutout: z.coerce
      .number()
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE)
      .default(DEFAULT_POINTS_VALUE),
    tradableDraftPicks: z.coerce
      .number()
      .min(TRADABLE_DRAFT_PICKS_MIN_VALUE)
      .max(TRADABLE_DRAFT_PICKS_MAX_VALUE)
      .default(DEFAULT_TRADABLE_DRAFT_PICKS),
    numberOfPlayersToProtect: z.coerce
      .number()
      .min(NUMBER_OF_PLAYERS_TO_PROTECT_MIN_VALUE)
      .max(NUMBER_OF_PLAYERS_TO_PROTECT_MAX_VALUE)
      .default(DEFAULT_NUMBER_OF_PLAYERS_TO_PROTECT),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const res = await fetch("/api-rust/create-pool", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        pool_name: values.name,
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
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      toast({
        variant: "destructive",
        title: t("CouldNotGeneratePoolError", {
          name: values.name,
          error: error,
        }),
        duration: 2000,
      });
      return;
    }
    router.push(`/pool/${values.name}`);
  };

  const GeneralSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>{t("GeneralSettings")}</CardTitle>
        {isCreationContext() ? (
          <CardDescription>{t("GeneralSettingsDescription")}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FormField
            control={form.control}
            name="name"
            disabled={!isCreationContext()}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("PoolName")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("PoolName")}
                    {...field}
                    defaultValue={DEFAULT_POOL_NAME}
                  />
                </FormControl>
                <FormDescription />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="numberOfPooler"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("NumberPooler")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={MIN_POOLER_NUMBER}
                    max={MAX_POOLER_NUMBER}
                    defaultValue={DEFAULT_POOLER_NUMBER}
                  />
                </FormControl>
                <FormDescription />
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <Label>{t("PoolType")}</Label>
            <RadioGroup
              onValueChange={(value) =>
                setShowDynastySettings(value === PoolType.DYNASTY)
              }
              defaultValue={DEFAULT_POOL_TYPE}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value={PoolType.STANDARD} id="r1" />
                <Label htmlFor="r1">Standard</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value={PoolType.DYNASTY} id="r2" />
                <Label htmlFor="r2">{t("Dynasty")} </Label>
                <Popover>
                  <PopoverTrigger className="hover:cursor-pointer" asChild>
                    <LucideAlertOctagon />
                  </PopoverTrigger>
                  <PopoverContent className="p-0">
                    {t("DynastyPoolTypeDescription")}
                  </PopoverContent>
                </Popover>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label>{t("DraftType")}</Label>
            <RadioGroup defaultValue={DEFAULT_DRAFT_TYPE}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value={DraftType.SERPENTINE} />
                <Label>{t("Serpentine")}</Label>
                <Popover>
                  <PopoverTrigger className="hover:cursor-pointer" asChild>
                    <LucideAlertOctagon />
                  </PopoverTrigger>
                  <PopoverContent className="p-0">
                    {t("SerpentinDescription")}
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value={DraftType.STANDARD} />
                <Label>Standard</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        {showDynastySettings ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormField
                control={form.control}
                name="tradableDraftPicks"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>{t("TradableDraftPicks")}</FormLabel>
                      <Popover>
                        <PopoverTrigger
                          className="hover:cursor-pointer"
                          asChild
                        >
                          <LucideAlertOctagon />
                        </PopoverTrigger>
                        <PopoverContent className="p-0">
                          {t("TradablePicksDescription")}
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        defaultValue={DEFAULT_TRADABLE_DRAFT_PICKS}
                        min={TRADABLE_DRAFT_PICKS_MIN_VALUE}
                        max={TRADABLE_DRAFT_PICKS_MAX_VALUE}
                      />
                    </FormControl>
                    <FormDescription />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <FormField
                control={form.control}
                name="numberOfPlayersToProtect"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>{t("NumberOfProtectedPlayers")}</FormLabel>
                      <Popover>
                        <PopoverTrigger
                          className="hover:cursor-pointer"
                          asChild
                        >
                          <LucideAlertOctagon />
                        </PopoverTrigger>
                        <PopoverContent className="p-0">
                          {t("NumberOfPlayersToProtectDescription")}
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        defaultValue={DEFAULT_NUMBER_OF_PLAYERS_TO_PROTECT}
                        min={NUMBER_OF_PLAYERS_TO_PROTECT_MIN_VALUE}
                        max={NUMBER_OF_PLAYERS_TO_PROTECT_MAX_VALUE}
                      />
                    </FormControl>
                    <FormDescription />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const PlayerSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>{t("PlayerSettings")}</CardTitle>
        {isCreationContext() ? (
          <CardDescription>{t("PlayerSettingsDescription")}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <FormField
            control={form.control}
            name="numberOfForwards"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("NumberOfForwards")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={NUMBER_FORWARDS_MIN_VALUE}
                    max={NUMBER_FORWARDS_MAX_VALUE}
                    defaultValue={DEFAULT_NUMBER_FORWARDS}
                  />
                </FormControl>
                <FormDescription />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="numberOfDefenders"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("NumberOfDefenders")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={NUMBER_DEFENDERS_MIN_VALUE}
                    max={NUMBER_DEFENDERS_MAX_VALUE}
                    defaultValue={DEFAULT_NUMBER_DEFENDERS}
                  />
                </FormControl>
                <FormDescription />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="numberOfGoalies"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("NumberOfGoalies")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={NUMBER_GOALIES_MIN_VALUE}
                    max={NUMBER_GOALIES_MAX_VALUE}
                    defaultValue={DEFAULT_NUMBER_GOALIES}
                  />
                </FormControl>
                <FormDescription />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="numberOfReservists"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("NumberOfReservists")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={NUMBER_RESERVISTS_MIN_VALUE}
                    max={NUMBER_RESERVISTS_MAX_VALUE}
                    defaultValue={DEFAULT_NUMBER_RESERVISTS}
                  />
                </FormControl>
                <FormDescription />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="ignore-players"
            defaultChecked={DEFAULT_IGNORE_WORST_PLAYERS}
            onCheckedChange={(checkedState) =>
              // @ts-ignore
              setShowIgnorePlayers(checkedState)
            }
          />
          <Label>{t("IgnoreWorstPlayers")}</Label>
          <Popover>
            <PopoverTrigger className="hover:cursor-pointer" asChild>
              <LucideAlertOctagon />
            </PopoverTrigger>
            <PopoverContent className="p-0">
              {t("IgnoreWorstPlayersDescription")}
            </PopoverContent>
          </Popover>
        </div>
        {showIgnorePlayers ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="numberOfWorstForwardsToIgnore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Forwards")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={NUMBER_WORST_FORWARDS_TO_IGNORE_MIN_VALUE}
                      max={NUMBER_WORST_FORWARDS_TO_IGNORE_MAX_VALUE}
                      defaultValue={DEFAULT_NUMBER_WORST_FORWARDS_TO_IGNORE}
                    />
                  </FormControl>
                  <FormDescription />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numberOfWorstDefendersToIgnore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Defense")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={NUMBER_WORST_DEFENDERS_TO_IGNORE_MIN_VALUE}
                      max={NUMBER_WORST_DEFENDERS_TO_IGNORE_MAX_VALUE}
                      defaultValue={DEFAULT_NUMBER_WORST_DEFENDERS_TO_IGNORE}
                    />
                  </FormControl>
                  <FormDescription />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numberOfWorstGoaliesToIgnore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Goalies")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={NUMBER_WORST_GOALIES_TO_IGNORE_MIN_VALUE}
                      max={NUMBER_WORST_GOALIES_TO_IGNORE_MAX_VALUE}
                      defaultValue={DEFAULT_NUMBER_WORST_GOALIES_TO_IGNORE}
                    />
                  </FormControl>
                  <FormDescription />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const PointsField = (
    fieldName: string,
    label: string,
    defaultValue: number
  ) => (
    <FormField
      control={form.control}
      // @ts-ignore
      name={fieldName}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between">
          <FormLabel className="w-5/12">{t(label)}</FormLabel>
          <FormControl>
            <Input
              {...field}
              className="w-7/12"
              step="any"
              type="number"
              min={POINTS_MIN_VALUE}
              max={POINTS_MAX_VALUE}
              defaultValue={defaultValue}
            />
          </FormControl>
          <FormDescription />
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const PointsSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle>{t("PointsSettings")}</CardTitle>
        {isCreationContext() ? (
          <CardDescription>{t("PontsSettingsDescription")}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="text-lg font-semibold">{t("Forwards")}</h3>
            {PointsField(
              "forwardsPointsPerGoals",
              "Goals",
              DEFAULT_FORWARDS_POINTS_PER_GOALS
            )}
            {PointsField(
              "forwardsPointsPerAssists",
              "Assists",
              DEFAULT_FORWARDS_POINTS_PER_ASSITS
            )}
            {PointsField(
              "forwardsPointsPerHatTricks",
              "HatTricks",
              DEFAULT_FORWARDS_POINTS_PER_HATTRICKS
            )}
            {PointsField(
              "forwardsPointsPerShootOutGoals",
              "ShootoutGoals",
              DEFAULT_FORWARDS_POINTS_PER_SHOOTOUT_GOALS
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t("Defense")}</h3>
            {PointsField(
              "defendersPointsPerGoals",
              "Goals",
              DEFAULT_DEFENDERS_POINTS_PER_GOALS
            )}
            {PointsField(
              "defendersPointsPerAssists",
              "Assists",
              DEFAULT_DEFENDERS_POINTS_PER_ASSITS
            )}
            {PointsField(
              "defendersPointsPerHatTricks",
              "HatTricks",
              DEFAULT_DEFENDERS_POINTS_PER_HATTRICKS
            )}
            {PointsField(
              "defendersPointsPerShootOutGoals",
              "ShootoutGoals",
              DEFAULT_DEFENDERS_POINTS_PER_SHOOTOUT_GOALS
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t("Goalies")}</h3>
            {PointsField(
              "goaliesPointsPerWins",
              "Wins",
              DEFAULT_GOALIES_POINTS_PER_WINS
            )}
            {PointsField(
              "goaliesPointsPerOvertimeLosses",
              "OvertimeLosses",
              DEFAULT_GOALIES_POINTS_PER_OVERTIME_LOSSES
            )}
            {PointsField(
              "goaliesPointsPerShutout",
              "Shutouts",
              DEFAULT_GOALIES_POINTS_PER_SHUTOUT
            )}
            {PointsField(
              "goaliesPointsPerGoals",
              "Goals",
              DEFAULT_GOALIES_POINTS_PER_GOALS
            )}
            {PointsField(
              "goaliesPointsPerAssists",
              "Assists",
              DEFAULT_GOALIES_POINTS_PER_ASSITS
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="text-left mx-auto space-y-8">
      <Form {...form}>
        <fieldset disabled={DISABLE_OPTIONS}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {GeneralSettings()}
            {PlayerSettings()}
            {PointsSettings()}
            <div className="flex justify-end gap-4 p-2">
              <Button type="submit">
                {props.oldPoolSettings ? (
                  <>{t("Update")}</>
                ) : (
                  <>{t("Create")}</>
                )}
              </Button>
            </div>
          </form>
        </fieldset>
      </Form>
    </div>
  );
}
