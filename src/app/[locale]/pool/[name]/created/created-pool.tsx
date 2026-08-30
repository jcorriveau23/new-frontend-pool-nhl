/*
Created Pool Status displaying pool settings and the list of pooler.
Poolers can join the room and user info will be displayed here. The owner
of the pool is allowed to update pool settings and kick people out of the
room.
*/

import { toast } from "sonner";

import { hasPoolPrivilege, usePoolContext } from "@/context/pool-context";
import { PoolSettings } from "@/data/pool/model";
import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import PoolSettingsComponent from "@/components/pool-settings";
import { PoolerNameText } from "@/components/pooler-name";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CopyIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  SettingsIcon,
} from "lucide-react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useTranslations } from "next-intl";
import { Command, RoomUser, useSocketContext } from "@/context/socket-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import DraftOrderSelector from "@/components/draft-order-selector";
import { DialogTitle } from "@/components/ui/dialog";
import { useUser } from "@/context/useUserData";

const USER_NAME_MIN_LENGTH = 2;
const USER_NAME_MAX_LENGTH = 12;

export default function CreatedPool() {
  const { poolInfo } = usePoolContext();

  const userData = useUser();
  const t = useTranslations();
  const { roomUsers, sendSocketCommand } = useSocketContext();
  const [open, setOpen] = React.useState(false);

  const formSchema = z.object({
    name: z
      .string()
      .min(USER_NAME_MIN_LENGTH, {
        error: t("PoolNameMinLenghtValidation", {
          value: USER_NAME_MIN_LENGTH,
        }),
      })
      .max(USER_NAME_MAX_LENGTH, {
        error: t("PoolNameMaxLenghtValidation", {
          value: USER_NAME_MAX_LENGTH,
        }),
      }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const onReady = (checked: boolean) => {
    console.info(`on ready '${checked}'!`);
    sendSocketCommand(Command.OnReady, null);
  };

  const AddUser = (userName: string) => {
    console.info("Add user!");
    sendSocketCommand(Command.AddUser, `{"user_name": "${userName}"}`);
  };

  const RemoveUser = (userId: string) => {
    console.info("remove user!");
    sendSocketCommand(Command.RemoveUser, `{"user_id": "${userId}"}`);
  };

  const copyRoomUrl = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        // Clipboard API is unavailable in non-secure contexts (plain http).
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      toast(t("CopiedRoomUrl"), { duration: 2000 });
    } catch {
      toast.error(url, { duration: 5000 });
    }
  };

  const copiedRoomUrl = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="outline" size="icon" onClick={copyRoomUrl} />
          }
        >
          <CopyIcon className="size-4" />
        </TooltipTrigger>
        <TooltipContent>{t("ClickToCopy")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const onCreateUser = async (values: z.infer<typeof formSchema>) => {
    AddUser(values.name);
    setOpen(false);
  };

  const CreateUserDialog = () => (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
        <PlusCircleIcon className="size-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("CreateUser")}</DialogTitle>
          <DialogDescription>{t("ChoseUsername")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onCreateUser)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Username")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("Username")}
                      {...field}
                      defaultValue=""
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit">{t("Add")}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  const renderUserSpots = (users: Record<string, RoomUser>) => {
    const numberOfAvailableSpot =
      poolInfo.settings.number_poolers - Object.keys(users).length;

    const spots = [];

    for (let i = 0; i < numberOfAvailableSpot; i++) {
      spots.push(
        <li
          key={`spot-${i}`}
          className="flex min-h-12 items-center gap-3 rounded-md border border-dashed px-4 py-1"
        >
          <span className="flex-1 text-sm text-muted-foreground">
            {t("SpotAvailable")}
          </span>
          {i === 0 && userData.info?.id === poolInfo.owner
            ? CreateUserDialog()
            : null}
        </li>
      );
    }

    return spots;
  };

  // A pool still in its room goes through the socket rather than the http
  // endpoint, so every participant of the room sees the new settings at once.
  const onPoolSettingsChanges = (settings: PoolSettings) =>
    sendSocketCommand(
      Command.OnPoolSettingChanges,
      JSON.stringify({ pool_settings: settings })
    );

  const PoolSettingsDialog = () => (
    <Dialog modal={true}>
      <DialogTrigger render={<Button variant="outline" size="icon" />}>
        <SettingsIcon />
      </DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{t("PoolSettings")}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            <PoolSettingsComponent
              poolName={poolInfo.name}
              poolStatus={poolInfo.status}
              oldPoolSettings={poolInfo.settings}
              poolOwner={poolInfo.owner}
              participants={poolInfo.participants}
              canEdit={hasPoolPrivilege(userData.info?.id, poolInfo)}
              onUpdate={onPoolSettingsChanges}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderUsers = (users: Record<string, RoomUser>) => (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardDescription>
          {t("UsersForPoolDescription", {
            current: Object.keys(users).length,
            expected: poolInfo.settings.number_poolers,
          })}
        </CardDescription>
        <div className="flex shrink-0 items-center gap-2">
          {copiedRoomUrl()}
          {PoolSettingsDialog()}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {Object.keys(users).map((userId) => (
            <li
              key={users[userId].id}
              className="flex min-h-12 items-center gap-3 rounded-md bg-muted px-4 py-1"
            >
              {users[userId].email ? (
                <Checkbox
                  id={`is-ready-${userId}`}
                  checked={users[userId].is_ready}
                  onCheckedChange={(checked) => onReady(checked)}
                  disabled={userId !== userData.info?.id}
                />
              ) : (
                <span className="size-4" aria-hidden />
              )}
              <label
                htmlFor={`is-ready-${userId}`}
                className="flex min-w-0 flex-1 items-center font-medium"
              >
                <PoolerNameText
                  name={users[userId].name}
                  isYou={userId === userData.info?.id}
                  className="max-w-full"
                />
              </label>
              <div className="text-sm text-muted-foreground">
                {users[userId].is_ready ? t("Ready") : t("NotReady")}
              </div>
              {userData.info?.id === poolInfo.owner ? (
                userId !== userData.info?.id ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => RemoveUser(userId)}
                  >
                    <MinusCircleIcon className="size-4" />
                  </Button>
                ) : (
                  <span className="size-9" aria-hidden />
                )
              ) : null}
            </li>
          ))}
          {renderUserSpots(users)}
        </ul>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {roomUsers ? renderUsers(roomUsers) : <TableSkeleton />}
      <DraftOrderSelector />
    </div>
  );
}
