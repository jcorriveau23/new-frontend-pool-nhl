/*
TODO: Created Pool Status displaying pool settings and the list of pooler.
Poolers can join the room and user info will be displayed here. The owner
of the pool is allowed to update pool settings and kick people out of the
room.
*/

import { useToast } from "@/hooks/use-toast";

import { usePoolContext } from "@/context/pool-context";
import * as React from "react";
import { PoolSettings } from "@/data/pool/model";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import PoolSettingsComponent from "@/components/pool-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CopyIcon } from "@radix-ui/react-icons";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useTranslations } from "next-intl";
import {
  Command,
  RoomUser,
  createSocketCommand,
  useSocketContext,
} from "@/context/socket-context";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function CreatedPool() {
  const { poolInfo } = usePoolContext();
  const [poolSettingsUpdate, setPoolSettingsUpdate] =
    React.useState<PoolSettings | null>(null);

  const { toast } = useToast();
  const t = useTranslations();
  const { socket, roomUsers } = useSocketContext();

  React.useEffect(() => {
    socket.onerror = (error) => {
      console.error("WebSocket errors:", error);
    };
  }, []);

  const updatePoolSettings = () => {
    if (socket && poolSettingsUpdate) {
      const newPoolSettings = { ...poolInfo.settings, ...poolSettingsUpdate };
      socket.send(
        createSocketCommand(
          Command.OnPoolSettingChanges,
          `{"pool_settings": ${JSON.stringify(newPoolSettings)}}`
        )
      );
    }
  };

  const onReady = () => {
    console.log("on ready!");
    socket.send(`"${Command.OnReady}"`);
  };

  const startDraft = () => {
    socket.send(`"${Command.StartDraft}"`);
  };

  const copiedRoomUrl = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              // navigator.clipboard.writeText("This text has been copied!");
              toast({
                title: t("CopiedRoomUrl"),
                duration: 2000,
              });
            }}
          >
            <CopyIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("ClickToCopy")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const areAllUsersReady = (users: Record<string, RoomUser>) =>
    // The draft is ready to start if all poolers are ready and the
    // number of poolers match the number of poolers in the settings.
    Object.values(users).every((user) => user.is_ready) &&
    Object.keys(users).length === poolInfo.settings.number_poolers;

  const renderUserSpots = (users: Record<string, RoomUser>) => {
    const numberOfAvailableSpot =
      poolInfo.settings.number_poolers - Object.keys(users).length;

    const spots = [];

    for (let i = 0; i < numberOfAvailableSpot; i++) {
      spots.push(
        <li
          key={i}
          className="flex items-center justify-between rounded-md bg-muted px-4"
        >
          <div className="flex items-center gap-2"></div>
          <label className="font-medium">Spot</label>
        </li>
      );
    }

    return spots;
  };

  const renderUsers = (users: Record<string, RoomUser>) => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {t("UsersForPool", { poolName: poolInfo.name })}
          {copiedRoomUrl()}
        </CardTitle>
        <CardDescription>
          {t("UsersForPoolDescription", {
            current: Object.keys(users).length,
            expected: poolInfo.settings.number_poolers,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {Object.keys(users).map((userId) => (
            <li
              key={users[userId].id}
              className="flex items-center justify-between rounded-md bg-muted px-4"
            >
              <Checkbox
                id="is-ready"
                defaultChecked={users[userId].is_ready}
                onCheckedChange={(checkedState) => onReady()}
              />
              <label className="font-medium">{users[userId].email}</label>
              <div className="text-sm text-muted-foreground">
                {users[userId].is_ready ? t("Ready") : t("NotReady")}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <Button disabled={!areAllUsersReady(users)}>{t("StartDraft")}</Button>
      </CardFooter>
    </Card>
  );

  return (
    <div>
      {roomUsers ? (
        <>
          {renderUsers(roomUsers)}
          {renderUserSpots(roomUsers)}
        </>
      ) : (
        <LoadingSpinner />
      )}
      <Accordion type="single" collapsible defaultValue="settings">
        <AccordionItem value="settings">
          <AccordionTrigger>{t("PoolSettings")}</AccordionTrigger>
          <AccordionContent>
            <PoolSettingsComponent
              poolName={poolInfo.name}
              poolStatus={poolInfo.status}
              oldPoolSettings={poolInfo.settings}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
