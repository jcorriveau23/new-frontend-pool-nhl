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
import {
  DraftType,
  Pool,
  PoolSettings,
  PoolState,
  PoolUser,
} from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";
import { RadioGroupItem, RadioGroup } from "@/components/ui/radio-group";
import { useTranslations } from "next-intl";
import { PoolerNameText } from "@/components/pooler-name";
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
import { Switch } from "./ui/switch";
import { useRouter } from "@/i18n/routing";
import { useSession } from "@/context/useSessionData";
import { toast } from "sonner";
import InformationIcon from "./information-box";
import { useSearchParams } from "next/navigation";
import { salaryFormat } from "@/app/utils/formating";
import { LockIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useUser } from "@/context/useUserData";
import DeletePoolDialog from "./delete-pool-dialog";
import RenamePoolerDialog from "./rename-pooler-dialog";

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

  // Owner and participants of the pool, needed to pick the assistants. Both are
  // unknown while the pool is being created.
  poolOwner?: string;
  participants?: PoolUser[];

  // Whether the signed in user may change the settings. Creating a pool always
  // is, an existing pool only for its owner and its assistants.
  canEdit?: boolean;

  // A pool still in the `Created` state pushes its settings through the draft
  // socket so everyone in the room sees the change live. When provided, it
  // replaces the http call.
  onUpdate?: (settings: PoolSettings) => void;

  // Receives the pool sent back by the backend after a successful update.
  onUpdated?: (pool: Pool) => void;
}

export const POOL_NAME_MIN_LENGTH = 5;
export const POOL_NAME_MAX_LENGTH = 16;

// The backend stores the points as u8, decimals would be rejected.
const POINTS_MIN_VALUE = 0;
const POINTS_MAX_VALUE = 255;
const DEFAULT_POINTS_VALUE = 1;

const SALARY_CAP_MIN_VALUE = 0;
const SALARY_CAP_MAX_VALUE = 500_000_000;
const DEFAULT_SALARY_CAP = 82_500_000;

// An emptied number input holds no value, which the schema reports as a missing
// field. `Number(value) || null` was used before and mapped a legitimate 0 (no
// reservist, no worst player ignored) to that same missing value.
const numberOrNull = (value: string): number | null =>
  value.trim().length === 0 ? null : Number(value);

export default function PoolSettingsComponent(props: Props) {
  const t = useTranslations();
  const userSession = useSession();
  const userData = useUser();

  const router = useRouter();
  const searchParams = useSearchParams();

  const isCreationContext = (): boolean => props.oldPoolSettings === null;

  // Who is allowed to save. Creating a pool is always allowed, updating one is
  // gated by the caller on the owner/assistant rights.
  const CAN_EDIT = props.canEdit ?? isCreationContext();

  // The roster shape and the dynasty rules are baked into the rosters that are
  // already drafted, the backend refuses to change them once the draft started.
  // Everything else (scoring, salary cap, assistants, ...) stays editable.
  const STRUCTURE_LOCKED =
    !isCreationContext() && props.poolStatus !== PoolState.Created;

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

  // 5) Salary cap
  const DEFAULT_SALARY_CAP_ENABLED =
    (props.oldPoolSettings?.salary_cap ?? null) !== null;

  const [showDynastySettings, setShowDynastySettings] = React.useState(
    DEFAULT_POOL_TYPE === PoolType.DYNASTY
  );
  const [showIgnorePlayers, setShowIgnorePlayers] = React.useState(
    DEFAULT_IGNORE_WORST_PLAYERS
  );
  const [salaryCapEnabled, setSalaryCapEnabled] = React.useState(
    DEFAULT_SALARY_CAP_ENABLED
  );

  // Both are list settings without a matching form control, they are kept
  // aside and merged back into the payload on submit.
  const [rosterModificationDates, setRosterModificationDates] = React.useState<
    string[]
  >(() => [...(props.oldPoolSettings?.roster_modification_date ?? [])].sort());
  const [assistants, setAssistants] = React.useState<string[]>(
    props.oldPoolSettings?.assistants ?? []
  );
  const [newModificationDate, setNewModificationDate] = React.useState("");

  // The backend deserializes every points setting as a u8, a decimal or an out
  // of range value is rejected before it reaches any validation of ours.
  const pointsSchema = () =>
    z
      .number()
      .int({ error: t("PointsMustBeWholeNumberValidation") })
      .min(POINTS_MIN_VALUE)
      .max(POINTS_MAX_VALUE);

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
    forwardsPointsPerGoals: pointsSchema(),
    forwardsPointsPerAssists: pointsSchema(),
    forwardsPointsPerHatTricks: pointsSchema(),
    forwardsPointsPerShootOutGoals: pointsSchema(),
    // Defenders
    defendersPointsPerGoals: pointsSchema(),
    defendersPointsPerAssists: pointsSchema(),
    defendersPointsPerHatTricks: pointsSchema(),
    defendersPointsPerShootOutGoals: pointsSchema(),
    // Goalies
    goaliesPointsPerGoals: pointsSchema(),
    goaliesPointsPerAssists: pointsSchema(),
    goaliesPointsPerWins: pointsSchema(),
    goaliesPointsPerOvertimeLosses: pointsSchema(),
    goaliesPointsPerShutout: pointsSchema(),
    tradableDraftPicks: z
      .number()
      .min(TRADABLE_DRAFT_PICKS_MIN_VALUE)
      .max(TRADABLE_DRAFT_PICKS_MAX_VALUE),
    numberOfPlayersToProtect: z
      .number()
      .min(NUMBER_OF_PLAYERS_TO_PROTECT_MIN_VALUE)
      .max(NUMBER_OF_PLAYERS_TO_PROTECT_MAX_VALUE),
    salaryCap: z.number().min(SALARY_CAP_MIN_VALUE).max(SALARY_CAP_MAX_VALUE),
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
      salaryCap: props.oldPoolSettings?.salary_cap ?? DEFAULT_SALARY_CAP,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Every field of PoolSettings has to be sent back: the backend replaces the
    // whole settings document, anything missing from the payload is dropped.
    const settings: PoolSettings = {
      number_poolers: values.numberOfPooler,
      draft_type: values.draftType,
      assistants: assistants,
      number_forwards: values.numberOfForwards,
      number_defenders: values.numberOfDefenders,
      number_goalies: values.numberOfGoalies,
      number_reservists: values.numberOfReservists,
      salary_cap: salaryCapEnabled ? values.salaryCap : null,
      roster_modification_date: rosterModificationDates,
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
            // Pool lineage is maintained by the backend when the next season is
            // generated, it is carried over untouched.
            past_season_pool_name:
              props.oldPoolSettings?.dynasty_settings?.past_season_pool_name ??
              [],
            next_season_pool_name:
              props.oldPoolSettings?.dynasty_settings?.next_season_pool_name ??
              null,
          }
        : null,
    };

    const poolName = values.name ?? DEFAULT_POOL_NAME;

    if (isCreationContext()) {
      const res = await apiPost(
        "/create-pool",
        { pool_name: poolName, settings },
        userSession.info?.jwt
      );

      if (!res.ok) {
        toast.error(
          t("CouldNotGeneratePoolError", { name: poolName, error: res.error }),
          { duration: 2000 }
        );
        // Stay on the form so the settings are not lost: navigating to the
        // pool page would only 404 since the pool was never created.
        return;
      }
      router.push(`/pool/${poolName}?${searchParams.toString()}`);
      return;
    }

    if (props.onUpdate) {
      props.onUpdate(settings);
      toast.success(t("SuccessUpdatePoolSettings"), { duration: 2000 });
      return;
    }

    const res = await apiPost<Pool>(
      "/update-pool-settings",
      { pool_name: poolName, settings },
      userSession.info?.jwt
    );

    if (!res.ok) {
      toast.error(
        t("CouldNotUpdatePoolError", { name: poolName, error: res.error }),
        { duration: 5000 }
      );
      return;
    }

    props.onUpdated?.(res.data);
    toast.success(t("SuccessUpdatePoolSettings"), { duration: 2000 });
  };

  type FormValues = z.infer<typeof formSchema>;

  const LockedHint = () =>
    STRUCTURE_LOCKED ? (
      <InformationIcon
        text={t("SettingLockedAfterDraftDescription")}
        className="text-muted-foreground"
      />
    ) : null;

  const NumberField = (
    fieldName: FieldPath<FormValues>,
    label: string,
    min: number,
    max: number,
    info?: string,
    // Kept out of react-hook-form's own `disabled`, which would strip the value
    // from the submitted payload and wipe the setting on the backend.
    locked?: boolean
  ) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-1.5">
            <FormLabel>{label}</FormLabel>
            {info ? <InformationIcon text={info} /> : null}
            {locked ? LockedHint() : null}
          </div>
          <FormControl>
            <Input
              {...field}
              type="number"
              step={1}
              min={min}
              max={max}
              disabled={locked}
              onChange={(e) => field.onChange(numberOrNull(e.target.value))}
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
    info?: string,
    locked?: boolean
  ) => (
    <div className="flex items-center gap-2">
      <RadioGroupItem value={value} id={id} disabled={locked} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      {info ? <InformationIcon text={info} /> : null}
    </div>
  );

  const DynastyLineage = () => {
    const dynastySettings = props.oldPoolSettings?.dynasty_settings;
    const pastPools = dynastySettings?.past_season_pool_name ?? [];
    const nextPool = dynastySettings?.next_season_pool_name ?? null;

    if (pastPools.length === 0 && nextPool === null) {
      return null;
    }

    return (
      <div className="space-y-1 text-sm">
        {pastPools.length > 0 ? (
          <p>
            <span className="text-muted-foreground">
              {t("PastSeasonPools")}:{" "}
            </span>
            {pastPools.join(", ")}
          </p>
        ) : null}
        {nextPool ? (
          <p>
            <span className="text-muted-foreground">
              {t("NextSeasonPool")}:{" "}
            </span>
            {nextPool}
          </p>
        ) : null}
      </div>
    );
  };

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
            MAX_POOLER_NUMBER,
            undefined,
            STRUCTURE_LOCKED
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="typeOfPool"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-1.5">
                  <FormLabel>{t("PoolType")}</FormLabel>
                  {STRUCTURE_LOCKED ? LockedHint() : null}
                </div>
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
                      "Standard",
                      undefined,
                      STRUCTURE_LOCKED
                    )}
                    {RadioOption(
                      "pool-type-dynasty",
                      PoolType.DYNASTY,
                      t("Dynasty"),
                      t("DynastyPoolTypeDescription"),
                      STRUCTURE_LOCKED
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
          <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {NumberField(
                "tradableDraftPicks",
                t("TradableDraftPicks"),
                TRADABLE_DRAFT_PICKS_MIN_VALUE,
                TRADABLE_DRAFT_PICKS_MAX_VALUE,
                t("TradablePicksDescription"),
                STRUCTURE_LOCKED
              )}
              {NumberField(
                "numberOfPlayersToProtect",
                t("NumberOfProtectedPlayers"),
                NUMBER_OF_PLAYERS_TO_PROTECT_MIN_VALUE,
                NUMBER_OF_PLAYERS_TO_PROTECT_MAX_VALUE,
                t("NumberOfPlayersToProtectDescription"),
                STRUCTURE_LOCKED
              )}
            </div>
            {DynastyLineage()}
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
            NUMBER_FORWARDS_MAX_VALUE,
            undefined,
            STRUCTURE_LOCKED
          )}
          {NumberField(
            "numberOfDefenders",
            t("NumberOfDefenders"),
            NUMBER_DEFENDERS_MIN_VALUE,
            NUMBER_DEFENDERS_MAX_VALUE,
            undefined,
            STRUCTURE_LOCKED
          )}
          {NumberField(
            "numberOfGoalies",
            t("NumberOfGoalies"),
            NUMBER_GOALIES_MIN_VALUE,
            NUMBER_GOALIES_MAX_VALUE,
            undefined,
            STRUCTURE_LOCKED
          )}
          {NumberField(
            "numberOfReservists",
            t("NumberOfReservists"),
            NUMBER_RESERVISTS_MIN_VALUE,
            NUMBER_RESERVISTS_MAX_VALUE,
            undefined,
            STRUCTURE_LOCKED
          )}
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="ignore-players"
            checked={showIgnorePlayers}
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
              step={1}
              type="number"
              min={POINTS_MIN_VALUE}
              max={POINTS_MAX_VALUE}
              onChange={(e) => field.onChange(numberOrNull(e.target.value))}
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

  const addModificationDate = () => {
    if (newModificationDate.length === 0) {
      return;
    }
    setRosterModificationDates((dates) =>
      dates.includes(newModificationDate)
        ? dates
        : [...dates, newModificationDate].sort()
    );
    setNewModificationDate("");
  };

  const RosterRulesSettings = () => (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("RosterRulesSettings")}</CardTitle>
        {isCreationContext() ? (
          <CardDescription>
            {t("RosterRulesSettingsDescription")}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              id="salary-cap-enabled"
              checked={salaryCapEnabled}
              onCheckedChange={(checked) => setSalaryCapEnabled(checked)}
            />
            <Label htmlFor="salary-cap-enabled" className="font-normal">
              {t("EnableSalaryCap")}
            </Label>
            <InformationIcon text={t("SalaryCapSettingDescription")} />
          </div>
          {salaryCapEnabled ? (
            <FormField
              control={form.control}
              name="salaryCap"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>{t("SalaryCap")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step={100000}
                      min={SALARY_CAP_MIN_VALUE}
                      max={SALARY_CAP_MAX_VALUE}
                      onChange={(e) =>
                        field.onChange(numberOrNull(e.target.value))
                      }
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {salaryFormat(field.value ?? 0)}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Label className="font-normal">
              {t("RosterModificationDates")}
            </Label>
            <InformationIcon text={t("RosterModificationDatesDescription")} />
          </div>
          {rosterModificationDates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("NoRosterModificationDate")}
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {rosterModificationDates.map((date) => (
                <li
                  key={date}
                  className="flex items-center gap-1 rounded-md border bg-muted/50 py-1 pl-3 pr-1 text-sm"
                >
                  {date}
                  {CAN_EDIT ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={t("RemoveRosterModificationDate", { date })}
                      onClick={() =>
                        setRosterModificationDates((dates) =>
                          dates.filter((d) => d !== date)
                        )
                      }
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {CAN_EDIT ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                className="w-auto"
                aria-label={t("RosterModificationDates")}
                value={newModificationDate}
                onChange={(e) => setNewModificationDate(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addModificationDate}
                disabled={newModificationDate.length === 0}
              >
                <PlusIcon className="size-4" />
                {t("Add")}
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  const assistantCandidates = (props.participants ?? []).filter(
    (participant) =>
      participant.is_owned && participant.id !== (props.poolOwner ?? "")
  );

  const ownerName =
    props.participants?.find(
      (participant) => participant.id === (props.poolOwner ?? "")
    )?.name ?? props.poolOwner;

  const PermissionSettings = () => (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("PermissionSettings")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ownerName ? (
          <p className="text-sm">
            <span className="text-muted-foreground">{t("Owner")}: </span>
            {ownerName}
          </p>
        ) : null}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Label className="font-normal">{t("Assistants")}</Label>
            <InformationIcon text={t("AssistantsDescription")} />
          </div>
          {assistantCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("NoAssistantCandidate")}
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {assistantCandidates.map((participant) => (
                <li key={participant.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`assistant-${participant.id}`}
                    checked={assistants.includes(participant.id)}
                    onCheckedChange={(checked) =>
                      setAssistants((current) =>
                        checked
                          ? [...current, participant.id]
                          : current.filter((id) => id !== participant.id)
                      )
                    }
                  />
                  <Label
                    htmlFor={`assistant-${participant.id}`}
                    className="font-normal"
                  >
                    <PoolerNameText name={participant.name} />
                  </Label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Renaming a pooler is the owner's alone as well, and only makes sense once
  // the pool has participants: before the draft the poolers still live in the
  // draft room, where the owner names them as they are added.
  const PoolerSettings = () => (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("PoolerSettings")}</CardTitle>
        <CardDescription>{t("RenamePoolerDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {(props.participants ?? []).map((participant) => (
            <li
              key={participant.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <PoolerNameText name={participant.name} />
              <RenamePoolerDialog
                poolName={props.poolName}
                pooler={participant}
                participants={props.participants ?? []}
                onRenamed={(pool) => props.onUpdated?.(pool)}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("RenamePoolerLabel", {
                      name: participant.name,
                    })}
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  // Deleting a pool is the owner's call alone: assistants may tune the settings
  // but not take the pool away from everyone else.
  const IS_OWNER =
    !isCreationContext() &&
    props.poolOwner !== undefined &&
    userData.info?.id === props.poolOwner;

  const DangerZone = () => (
    <Card className="border-destructive/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-destructive text-lg">
          {t("DangerZone")}
        </CardTitle>
        <CardDescription>{t("DeletePoolDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <DeletePoolDialog
          poolName={props.poolName}
          // The pool page it was deleted from no longer exists, its own season
          // list is the closest place left to land on.
          onDeleted={(pool) =>
            router.push(`/pools/${pool.season}?${searchParams.toString()}`)
          }
          trigger={
            <Button variant="destructive" className="w-full sm:w-auto">
              <Trash2Icon />
              {t("DeletePool")}
            </Button>
          }
        />
      </CardContent>
    </Card>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <fieldset disabled={!CAN_EDIT} className="min-w-0 space-y-4 text-left">
          {!CAN_EDIT ? (
            <div className="flex items-start gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              <LockIcon className="mt-0.5 size-4 shrink-0" />
              <p>{t("PoolSettingsReadOnlyDescription")}</p>
            </div>
          ) : null}
          {GeneralSettings()}
          {PlayerSettings()}
          {PointsSettings()}
          {RosterRulesSettings()}
          {isCreationContext() ? null : PermissionSettings()}
          {CAN_EDIT ? (
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto sm:px-8"
              >
                {props.oldPoolSettings ? t("Update") : t("Create")}
              </Button>
            </div>
          ) : null}
        </fieldset>
      </form>
      {IS_OWNER ? (
        <div className="space-y-4 pt-4 text-left">
          {(props.participants ?? []).length > 0 ? PoolerSettings() : null}
          {DangerZone()}
        </div>
      ) : null}
    </Form>
  );
}
