/*
Created Pool Status displaying pool settings and the list of pooler.
Poolers can join the room and user info will be displayed here. The owner
of the pool is allowed to update pool settings and kick people out of the
room.
*/

import { useToast } from "@/hooks/use-toast";

import { usePoolContext } from "@/context/pool-context";
import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import PoolSettingsComponent from "@/components/pool-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  PlusCircledIcon,
  MinusCircledIcon,
  GearIcon,
} from "@radix-ui/react-icons";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import DraftOrderSelector from "@/components/draft-order-selector";
import { DialogTitle } from "@radix-ui/react-dialog";
import { CheckedState } from "@radix-ui/react-checkbox";
import { useUser } from "@/context/useUserData";

const USER_NAME_MIN_LENGTH = 2;
const USER_NAME_MAX_LENGTH = 12;

export default function CreatedPool() {
  const { poolInfo } = usePoolContext();

  const userData = useUser();
  const { toast } = useToast();
  const t = useTranslations();
  const { roomUsers, sendSocketCommand } = useSocketContext();
  const [open, setOpen] = React.useState(false);

  const formSchema = z.object({
    name: z
      .string()
      .min(USER_NAME_MIN_LENGTH, {
        message: t("PoolNameMinLenghtValidation", {
          value: USER_NAME_MIN_LENGTH,
        }),
      })
      .max(USER_NAME_MAX_LENGTH, {
        message: t("PoolNameMaxLenghtValidation", {
          value: USER_NAME_MAX_LENGTH,
        }),
      })
      .default(""),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const onReady = (checked: CheckedState) => {
    console.log(`on ready '${checked}'!`);

    sendSocketCommand(Command.OnReady, null);
  };

  const AddUser = (userName: string) => {
    console.log("Add user!");
    sendSocketCommand(Command.AddUser, `{"user_name": "${userName}"}`);
  };

  const RemoveUser = (userId: string) => {
    console.log("remove user!");
    sendSocketCommand(Command.RemoveUser, `{"user_id": "${userId}"}`);
  };

  const copiedRoomUrl = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
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

  const onCreateUser = async (values: z.infer<typeof formSchema>) => {
    AddUser(values.name);
    setOpen(false);
  };

  const CreateUserDialog = () => (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <PlusCircledIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a user</DialogTitle>
          <DialogDescription>{t("ChoseUsername")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onCreateUser)}>
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
                  <FormDescription />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">{t("Add")}</Button>
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
          key={i}
          className="flex items-center justify-between rounded-md bg-muted px-4"
        >
          <div className="flex items-center gap-2"></div>
          <label className="font-medium">{t("SpotAvailable")}</label>
          {userData.info?.id === poolInfo.owner ? CreateUserDialog() : null}
        </li>
      );
    }

    return spots;
  };

  const PoolSettingsDialog = () => (
    <Dialog modal={true}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <GearIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pool Settings</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-96">
          <PoolSettingsComponent
            poolName={poolInfo.name}
            poolStatus={poolInfo.status}
            oldPoolSettings={poolInfo.settings}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );

  const renderUsers = (users: Record<string, RoomUser>) => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardDescription>
          <div className="p-2">
            {t("UsersForPoolDescription", {
              current: Object.keys(users).length,
              expected: poolInfo.settings.number_poolers,
            })}
            {copiedRoomUrl()}
            {PoolSettingsDialog()}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {Object.keys(users).map((userId) => (
            <>
              <li
                key={users[userId].id}
                className="flex items-center justify-between rounded-md bg-muted px-4"
              >
                {users[userId].email ? (
                  <Checkbox
                    id="is-ready"
                    checked={users[userId].is_ready}
                    onCheckedChange={(checked) => onReady(checked)}
                    disabled={userId !== userData.info?.id}
                  />
                ) : null}
                <label className="font-medium">{users[userId].name}</label>
                <div className="text-sm text-muted-foreground">
                  {users[userId].is_ready ? t("Ready") : t("NotReady")}
                </div>
                {userData.info?.id === poolInfo.owner &&
                userId !== userData.info?.id ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => RemoveUser(userId)}
                  >
                    <MinusCircledIcon className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            </>
          ))}
          {renderUserSpots(users)}
        </ul>
      </CardContent>
      <CardFooter className="flex justify-end"></CardFooter>
    </Card>
  );

  return (
    <div className="flex items-center justify-center">
      {roomUsers ? <>{renderUsers(roomUsers)}</> : <LoadingSpinner />}
      <DraftOrderSelector />
    </div>
  );
}
