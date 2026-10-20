"use client";

/*
The owner's controls: settle a date, edit the settings, and delete the pool.

Settling used to have a companion button that closed a date to picks, pressed
at the first puck drop because that is what revealed them. The deadline is each
game's own start time now — a team can be picked until it takes the ice — so
closing a date is nothing anybody has to remember to do, and the reveal follows
the last puck drop whether or not the owner is at their desk.

What settling does is the half no clock can derive: read the results and
eliminate whoever ran out of strikes. It does not carry one. Who won is read
from the league's own scoreboard inside the backend, because a screen that
could report a result could report its own win — which also makes it
idempotent, so it would suit a scheduled job later without this page changing.
*/

import * as React from "react";
import { Flag, Link2, Pencil, Trash2, UserPlus } from "lucide-react";
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
import {
  ParticipantAdminList,
  ParticipantAdminRow,
} from "@/components/participant-admin-list";
import LinkSurvivorParticipantDialog from "@/components/link-survivor-participant-dialog";
import RenameSurvivorParticipantDialog from "@/components/rename-survivor-participant-dialog";
import { useRouter } from "@/i18n/routing";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";
import { SurvivorPool, WeekStatus } from "@/data/survivor/model";
import { isOwner, weekOptions } from "@/lib/survivor";
import { addSurvivorParticipant, settleSurvivorWeek } from "@/lib/survivor-api";
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

  const weeks = React.useMemo(
    () => weekOptions(t, pool.weeks),
    [t, pool.weeks],
  );

  const settle = async () => {
    if (week === null) {
      return;
    }
    setIsWorking(true);
    const res = await settleSurvivorWeek(pool.name, week.week, jwt);
    setIsWorking(false);

    if (!res.ok) {
      toast.error(res.error, { duration: 5000 });
      return;
    }

    onPoolChange(res.data);
    toast.success(t("SurvivorWeekSettledToast", { week: week.week }));
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
          <div className="space-y-2 sm:flex sm:flex-wrap sm:items-end sm:gap-2 sm:space-y-0">
            <Select
              value={selectedWeek === null ? "" : String(selectedWeek)}
              items={weeks}
              onValueChange={(value) => setSelectedWeek(Number(value))}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder={t("SurvivorSelectWeek")} />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              className="w-full sm:w-auto"
              disabled={
                isWorking || week === null || week.status === WeekStatus.Settled
              }
              onClick={() => void settle()}
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
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="w-full space-y-1 sm:w-64">
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
              className="w-full sm:w-auto"
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
          <ParticipantAdminList>
            {pool.participants.map((participant) => {
              const pendingLink =
                pool.pending_participant_links?.find(
                  (pending) => pending.participant_id === participant.id,
                ) ?? null;

              return (
                <ParticipantAdminRow
                  key={participant.id}
                  name={participant.name}
                  isOwned={participant.is_owned}
                  pendingLink={pendingLink}
                >
                  {ownsPool ? (
                    <>
                      <RenameSurvivorParticipantDialog
                        poolName={pool.name}
                        participant={participant}
                        participants={pool.participants}
                        onUpdated={onPoolChange}
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isWorking}
                            aria-label={t("RenameParticipantLabel", {
                              name: participant.name,
                            })}
                          >
                            <Pencil className="size-4" />
                            {t("Rename")}
                          </Button>
                        }
                      />
                      <LinkSurvivorParticipantDialog
                        poolName={pool.name}
                        participant={participant}
                        pendingLink={pendingLink}
                        onUpdated={onPoolChange}
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isWorking}
                            aria-label={t(
                              pendingLink !== null
                                ? "PendingLinkLabel"
                                : "LinkAccountLabel",
                              { name: participant.name },
                            )}
                          >
                            <Link2 className="size-4" />
                            {pendingLink !== null
                              ? t("LinkInvitationSentAction")
                              : t("LinkAccountAction")}
                          </Button>
                        }
                      />
                    </>
                  ) : null}
                </ParticipantAdminRow>
              );
            })}
          </ParticipantAdminList>
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
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto"
                  disabled={isWorking}
                >
                  <Trash2 className="size-4" />
                  <span className="truncate">
                    {t("DeletePoolLabel", { pool: pool.name })}
                  </span>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
