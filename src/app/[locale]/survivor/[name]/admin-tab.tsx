"use client";

/*
The owner's controls: close a date to picks, settle it, edit the settings, and
delete the pool.

The two are deliberately separate buttons. Locking belongs at the first puck
drop — it is what reveals the picks, which is most of what people come to the
page for. Settling belongs hours later, once the last game is over, and is what
eliminates people.

Neither carries a result. Who won is read from the league's own scoreboard
inside the backend: a screen that could report a result could report its own
win. That also makes both idempotent, so the same calls would suit a scheduled
job later without this page changing.
*/

import * as React from "react";
import { Flag, Lock, Trash2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DeleteSurvivorPoolDialog from "@/components/delete-survivor-pool-dialog";
import { useRouter } from "@/i18n/routing";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";
import { SurvivorPool, WeekStatus } from "@/data/survivor/model";
import { isOwner } from "@/lib/survivor";
import {
  addSurvivorParticipant,
  lockSurvivorWeek,
  settleSurvivorWeek,
} from "@/lib/survivor-api";
import SettingsCard from "./settings-card";

interface Props {
  pool: SurvivorPool;
  onPoolChange: (pool: SurvivorPool) => void;
}

export default function AdminTab(props: Props) {
  const { pool, onPoolChange } = props;
  const t = useTranslations();
  const router = useRouter();
  const userSession = useSession();
  const jwt = userSession.info?.jwt;

  // The assistants settle dates, but editing the settings and deleting the
  // pool are the owner's alone — which is the rule the backend applies, so
  // showing either to an assistant would only earn them a refusal.
  const userData = useUser();
  const ownsPool = isOwner(pool, userData.info?.id);

  // The date the controls act on: whatever is being played, so the common case
  // takes no selection at all.
  const firstUnsettled =
    pool.weeks.find((week) => week.status !== WeekStatus.Settled) ?? null;
  const [selectedWeek, setSelectedWeek] = React.useState<number | null>(
    firstUnsettled?.week ?? null,
  );
  const [isWorking, setIsWorking] = React.useState(false);
  const [newParticipant, setNewParticipant] = React.useState("");

  /*
  Add a spot the organiser keeps on somebody's behalf.

  For the pool of a few friends where one person enters everybody: the
  participant this creates has no account, so the organiser files its picks
  from the pick screen too.
  */
  const addParticipant = async () => {
    setIsWorking(true);
    const res = await addSurvivorParticipant(
      pool.name,
      newParticipant.trim(),
      jwt,
    );
    setIsWorking(false);

    if (!res.ok) {
      toast.error(res.error, { duration: 5000 });
      return;
    }

    onPoolChange(res.data);
    toast.success(
      t("SurvivorParticipantAdded", { name: newParticipant.trim() }),
    );
    setNewParticipant("");
  };

  const week =
    pool.weeks.find((candidate) => candidate.week === selectedWeek) ?? null;

  const run = async (
    action: (
      poolName: string,
      week: number,
      jwt: string | null | undefined,
    ) => Promise<
      { ok: true; data: SurvivorPool } | { ok: false; error: string }
    >,
    successKey: string,
  ) => {
    if (week === null) {
      return;
    }
    setIsWorking(true);
    const res = await action(pool.name, week.week, jwt);
    setIsWorking(false);

    if (!res.ok) {
      toast.error(res.error, { duration: 5000 });
      return;
    }

    onPoolChange(res.data);
    toast.success(t(successKey, { week: week.week }));
  };

  return (
    <div className="space-y-4 text-left">
      <Card>
        <CardHeader>
          <CardTitle>{t("SurvivorRunTheWeek")}</CardTitle>
          <CardDescription>
            {t("SurvivorRunTheWeekDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <Select
              value={selectedWeek === null ? "" : String(selectedWeek)}
              onValueChange={(value) => setSelectedWeek(Number(value))}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder={t("SurvivorSelectWeek")} />
              </SelectTrigger>
              <SelectContent>
                {pool.weeks.map((candidate) => (
                  <SelectItem
                    key={candidate.week}
                    value={String(candidate.week)}
                  >
                    {t("SurvivorWeekLabel", { week: candidate.week })} —{" "}
                    {candidate.pick_date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              disabled={
                isWorking || week === null || week.status !== WeekStatus.Open
              }
              onClick={() => void run(lockSurvivorWeek, "SurvivorWeekLocked")}
            >
              <Lock className="size-4" />
              {t("SurvivorLockWeek")}
            </Button>

            <Button
              disabled={
                isWorking || week === null || week.status === WeekStatus.Settled
              }
              onClick={() =>
                void run(settleSurvivorWeek, "SurvivorWeekSettledToast")
              }
            >
              <Flag className="size-4" />
              {t("SurvivorSettleWeek")}
            </Button>
          </div>

          <Alert>
            <AlertDescription>
              {t("SurvivorSettleExplanation")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("SurvivorAddParticipant")}</CardTitle>
          <CardDescription>
            {t("SurvivorAddParticipantDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="survivor-new-participant">
                {t("SurvivorParticipantName")}
              </Label>
              <Input
                id="survivor-new-participant"
                value={newParticipant}
                maxLength={32}
                onChange={(event) => setNewParticipant(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={isWorking || newParticipant.trim().length === 0}
              onClick={() => void addParticipant()}
            >
              <UserPlus className="size-4" />
              {t("SurvivorAdd")}
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            {t("SurvivorParticipantCountLabel", {
              count: pool.participants.length,
              max: pool.settings.max_participants,
            })}
          </p>
        </CardContent>
      </Card>

      {ownsPool ? (
        <SettingsCard pool={pool} onPoolChange={onPoolChange} />
      ) : null}

      {ownsPool ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">
              {t("DangerZone")}
            </CardTitle>
            <CardDescription>
              {t("DeleteSurvivorPoolDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteSurvivorPoolDialog
              poolName={pool.name}
              // The page it was deleted from no longer exists; its own season
              // list is the closest place left to land on.
              onDeleted={() => router.push(`/pools/${pool.season}`)}
              trigger={
                <Button variant="destructive" disabled={isWorking}>
                  <Trash2 className="size-4" />
                  {t("DeletePoolLabel", { pool: pool.name })}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
