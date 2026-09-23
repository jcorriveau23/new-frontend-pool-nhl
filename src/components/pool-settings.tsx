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
  DropPeriod,
  PendingPoolerLink,
  Pool,
  PoolSettings,
  PoolState,
  PoolUser,
} from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";
import { RadioGroupItem, RadioGroup } from "@/components/ui/radio-group";
import { useTranslations } from "next-intl";
import { PoolerNameText } from "@/components/pooler-name";
import {
  buildPoolSettingsSchema,
  numberOrNull,
  poolSettingsDefaults,
  poolSettingsToggles,
  PoolSettingsFormValues,
  POOL_SETTINGS_BOUNDS,
  PoolType,
  toPoolSettings,
  type Translator,
} from "@/lib/pool-settings-form";
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
import {
  LinkIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useUser } from "@/context/useUserData";
import DeletePoolDialog from "./delete-pool-dialog";
import RenamePoolerDialog from "./rename-pooler-dialog";
import LinkPoolerAccountDialog from "./link-pooler-account-dialog";

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

  // Account links the owner filed that are still waiting on the person they
  // name. Unknown while the pool is being created, like the participants.
  pendingPoolerLinks?: PendingPoolerLink[] | null;

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

  // Every bound, default and validation message of the form lives in
  // `@/lib/pool-settings-form`; what stays here is the markup and the toggles.
  const defaultValues = React.useMemo(
    () => poolSettingsDefaults(props.poolName, props.oldPoolSettings),
    [props.poolName, props.oldPoolSettings],
  );
  const defaultToggles = React.useMemo(
    () => poolSettingsToggles(props.oldPoolSettings),
    [props.oldPoolSettings],
  );

  const [showDynastySettings, setShowDynastySettings] = React.useState(
    defaultToggles.dynasty,
  );
  const [showIgnorePlayers, setShowIgnorePlayers] = React.useState(
    defaultToggles.ignoreWorstPlayers,
  );
  const [salaryCapEnabled, setSalaryCapEnabled] = React.useState(
    defaultToggles.salaryCap,
  );
  const [playerDropsEnabled, setPlayerDropsEnabled] = React.useState(
    defaultToggles.playerDrops,
  );

  // Both are list settings without a matching form control, they are kept
  // aside and merged back into the payload on submit.
  const [rosterModificationDates, setRosterModificationDates] = React.useState<
    string[]
  >(() => [...(props.oldPoolSettings?.roster_modification_date ?? [])].sort());
  const [assistants, setAssistants] = React.useState<string[]>(
    props.oldPoolSettings?.assistants ?? [],
  );
  const [newModificationDate, setNewModificationDate] = React.useState("");

  // `t` is only ever called with the keys the schema names, which is what
  // Translator describes; next-intl's own type is keyed on the message file.
  const formSchema = React.useMemo(
    () => buildPoolSettingsSchema(t as Translator),
    [t],
  );

  const form = useForm<PoolSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (values: PoolSettingsFormValues) => {
    const settings = toPoolSettings(values, {
      toggles: {
        dynasty: showDynastySettings,
        ignoreWorstPlayers: showIgnorePlayers,
        salaryCap: salaryCapEnabled,
        playerDrops: playerDropsEnabled,
      },
      assistants,
      rosterModificationDates,
      oldPoolSettings: props.oldPoolSettings,
    });

    const poolName = values.name ?? props.poolName;

    if (isCreationContext()) {
      const res = await apiPost(
        "/create-pool",
        { pool_name: poolName, settings },
        userSession.info?.jwt,
      );

      if (!res.ok) {
        toast.error(
          t("CouldNotGeneratePoolError", { name: poolName, error: res.error }),
          { duration: 2000 },
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
      userSession.info?.jwt,
    );

    if (!res.ok) {
      toast.error(
        t("CouldNotUpdatePoolError", { name: poolName, error: res.error }),
        { duration: 5000 },
      );
      return;
    }

    props.onUpdated?.(res.data);
    toast.success(t("SuccessUpdatePoolSettings"), { duration: 2000 });
  };

  const LockedHint = () =>
    STRUCTURE_LOCKED ? (
      <InformationIcon
        text={t("SettingLockedAfterDraftDescription")}
        className="text-muted-foreground"
      />
    ) : null;

  const NumberField = (
    fieldName: FieldPath<PoolSettingsFormValues>,
    label: string,
    min: number,
    max: number,
    info?: string,
    // Kept out of react-hook-form's own `disabled`, which would strip the value
    // from the submitted payload and wipe the setting on the backend.
    locked?: boolean,
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
    locked?: boolean,
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
            POOL_SETTINGS_BOUNDS.numberOfPooler.min,
            POOL_SETTINGS_BOUNDS.numberOfPooler.max,
            undefined,
            STRUCTURE_LOCKED,
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
                      STRUCTURE_LOCKED,
                    )}
                    {RadioOption(
                      "pool-type-dynasty",
                      PoolType.DYNASTY,
                      t("Dynasty"),
                      t("DynastyPoolTypeDescription"),
                      STRUCTURE_LOCKED,
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
                      "Standard",
                    )}
                    {RadioOption(
                      "draft-type-serpentine",
                      DraftType.SERPENTINE,
                      t("Serpentine"),
                      t("SerpentinDescription"),
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
                POOL_SETTINGS_BOUNDS.tradableDraftPicks.min,
                POOL_SETTINGS_BOUNDS.tradableDraftPicks.max,
                t("TradablePicksDescription"),
                STRUCTURE_LOCKED,
              )}
              {NumberField(
                "numberOfPlayersToProtect",
                t("NumberOfProtectedPlayers"),
                POOL_SETTINGS_BOUNDS.numberOfPlayersToProtect.min,
                POOL_SETTINGS_BOUNDS.numberOfPlayersToProtect.max,
                t("NumberOfPlayersToProtectDescription"),
                STRUCTURE_LOCKED,
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
            POOL_SETTINGS_BOUNDS.numberOfForwards.min,
            POOL_SETTINGS_BOUNDS.numberOfForwards.max,
            undefined,
            STRUCTURE_LOCKED,
          )}
          {NumberField(
            "numberOfDefenders",
            t("NumberOfDefenders"),
            POOL_SETTINGS_BOUNDS.numberOfDefenders.min,
            POOL_SETTINGS_BOUNDS.numberOfDefenders.max,
            undefined,
            STRUCTURE_LOCKED,
          )}
          {NumberField(
            "numberOfGoalies",
            t("NumberOfGoalies"),
            POOL_SETTINGS_BOUNDS.numberOfGoalies.min,
            POOL_SETTINGS_BOUNDS.numberOfGoalies.max,
            undefined,
            STRUCTURE_LOCKED,
          )}
          {NumberField(
            "numberOfReservists",
            t("NumberOfReservists"),
            POOL_SETTINGS_BOUNDS.numberOfReservists.min,
            POOL_SETTINGS_BOUNDS.numberOfReservists.max,
            undefined,
            STRUCTURE_LOCKED,
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
              POOL_SETTINGS_BOUNDS.numberOfWorstForwardsToIgnore.min,
              POOL_SETTINGS_BOUNDS.numberOfWorstForwardsToIgnore.max,
            )}
            {NumberField(
              "numberOfWorstDefendersToIgnore",
              t("Defense"),
              POOL_SETTINGS_BOUNDS.numberOfWorstDefendersToIgnore.min,
              POOL_SETTINGS_BOUNDS.numberOfWorstDefendersToIgnore.max,
            )}
            {NumberField(
              "numberOfWorstGoaliesToIgnore",
              t("Goalies"),
              POOL_SETTINGS_BOUNDS.numberOfWorstGoaliesToIgnore.min,
              POOL_SETTINGS_BOUNDS.numberOfWorstGoaliesToIgnore.max,
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const PointsField = (
    fieldName: FieldPath<PoolSettingsFormValues>,
    label: string,
  ) => (
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
              min={POOL_SETTINGS_BOUNDS.points.min}
              max={POOL_SETTINGS_BOUNDS.points.max}
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
            </>,
          )}
          {PointsGroup(
            t("Defense"),
            <>
              {PointsField("defendersPointsPerGoals", "Goals")}
              {PointsField("defendersPointsPerAssists", "Assists")}
              {PointsField("defendersPointsPerHatTricks", "HatTricks")}
              {PointsField("defendersPointsPerShootOutGoals", "ShootoutGoals")}
            </>,
          )}
          {PointsGroup(
            t("Goalies"),
            <>
              {PointsField("goaliesPointsPerWins", "Wins")}
              {PointsField("goaliesPointsPerOvertimeLosses", "OvertimeLosses")}
              {PointsField("goaliesPointsPerShutout", "Shutouts")}
              {PointsField("goaliesPointsPerGoals", "Goals")}
              {PointsField("goaliesPointsPerAssists", "Assists")}
            </>,
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
        : [...dates, newModificationDate].sort(),
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
                      min={POOL_SETTINGS_BOUNDS.salaryCap.min}
                      max={POOL_SETTINGS_BOUNDS.salaryCap.max}
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
                          dates.filter((d) => d !== date),
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              id="player-drops-enabled"
              checked={playerDropsEnabled}
              disabled={!CAN_EDIT}
              onCheckedChange={(checked) => setPlayerDropsEnabled(checked)}
            />
            <Label htmlFor="player-drops-enabled" className="font-normal">
              {t("EnablePlayerDrops")}
            </Label>
            <InformationIcon text={t("PlayerDropsSettingDescription")} />
          </div>
          {playerDropsEnabled ? (
            <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
              <div className="max-w-xs">
                {NumberField(
                  "maxPlayerDrops",
                  t("MaxPlayerDrops"),
                  POOL_SETTINGS_BOUNDS.maxPlayerDrops.min,
                  POOL_SETTINGS_BOUNDS.maxPlayerDrops.max,
                  t("MaxPlayerDropsDescription"),
                )}
              </div>
              <FormField
                control={form.control}
                name="dropPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("DropPeriod")}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex min-h-9 flex-wrap items-center gap-x-6 gap-y-2"
                      >
                        {RadioOption(
                          "drop-period-season",
                          DropPeriod.SEASON,
                          t("PerSeason"),
                          t("DropPeriodSeasonDescription"),
                        )}
                        {RadioOption(
                          "drop-period-month",
                          DropPeriod.MONTH,
                          t("PerMonth"),
                          t("DropPeriodMonthDescription"),
                        )}
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  const assistantCandidates = (props.participants ?? []).filter(
    (participant) =>
      participant.is_owned && participant.id !== (props.poolOwner ?? ""),
  );

  const ownerName =
    props.participants?.find(
      (participant) => participant.id === (props.poolOwner ?? ""),
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
                          : current.filter((id) => id !== participant.id),
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

  // Renaming a pooler and handing it to another account are both the owner's
  // alone, and only make sense once the pool has participants: before the draft
  // the poolers still live in the draft room, where the owner names them as
  // they are added.
  // The invitation standing on a pooler, if any. Filed by the owner and waiting
  // on the person it names to sign in and accept it.
  const pendingLinkOf = (poolerUserId: string) =>
    props.pendingPoolerLinks?.find(
      (pending) => pending.pooler_user_id === poolerUserId,
    ) ?? null;

  const PoolerSettings = () => (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("PoolerSettings")}</CardTitle>
        <CardDescription>{t("PoolerSettingsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {(props.participants ?? []).map((participant) => (
            <li
              key={participant.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <PoolerNameText name={participant.name} />
              <div className="flex shrink-0 items-center gap-1">
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
                <LinkPoolerAccountDialog
                  poolName={props.poolName}
                  pooler={participant}
                  pendingLink={pendingLinkOf(participant.id)}
                  onUpdated={(pool) => props.onUpdated?.(pool)}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t(
                        pendingLinkOf(participant.id)
                          ? "PendingPoolerLinkLabel"
                          : "LinkPoolerAccountLabel",
                        { name: participant.name },
                      )}
                      // An invitation already waiting on this pooler is the one
                      // thing about it that is not visible from the row, and it
                      // is what the button does next (withdraw it, not file
                      // another).
                      className={
                        pendingLinkOf(participant.id) ? "text-primary" : ""
                      }
                    >
                      <LinkIcon className="size-4" />
                    </Button>
                  }
                />
              </div>
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
