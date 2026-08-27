/*
The live-connection indicator for the pool creation and draft rooms.

Every state is a labelled pill: a draft where updates have silently stopped
looks exactly like a draft where nobody is picking, so "the connection is fine"
has to be as readable at a glance as "it is broken" — an unlabelled icon that
only changes colour asks the user to remember what the colours meant.
*/
"use client";

import React, { useEffect, useState } from "react";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export enum SocketStatus {
  // Working towards the first connection of this room.
  Connecting = "Connecting",
  Connected = "Connected",
  // Was connected, dropped, and is on its way back — either a retry is in
  // flight or one is scheduled.
  Reconnecting = "Reconnecting",
  // The browser itself reports no network, so retrying is pointless until it
  // comes back. Distinguished from `Reconnecting` because the fix is the
  // user's (rejoin wifi), not ours.
  Offline = "Offline",
}

interface StatusPresentation {
  // Extra classes for the trigger, layered over the `outline` button variant.
  // The `dark:` background and hover rules are spelled out because that
  // variant sets its own and would otherwise win in dark mode.
  trigger: string;
  dot: string;
  // The dot pulses only while the socket is live, which is the one state with
  // no spinner of its own to show that something is still happening.
  pulse: boolean;
  icon: React.ComponentType<{ className?: string }> | null;
  spin: boolean;
  // Short enough to sit in the pill; the popover carries the full wording.
  pillKey: string;
  titleKey: string;
  descriptionKey: string;
}

const STATUS_PRESENTATION: Record<SocketStatus, StatusPresentation> = {
  [SocketStatus.Connected]: {
    trigger:
      "border-success/40 bg-success/10 text-success hover:bg-success/20 dark:border-success/40 dark:bg-success/15 dark:hover:bg-success/25",
    dot: "bg-success",
    pulse: true,
    icon: null,
    spin: false,
    pillKey: "SocketLive",
    titleKey: "SocketConnected",
    descriptionKey: "SocketConnectedDescription",
  },
  [SocketStatus.Connecting]: {
    trigger:
      "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 dark:border-primary/40 dark:bg-primary/15 dark:hover:bg-primary/25",
    dot: "bg-primary",
    pulse: false,
    icon: Loader2,
    spin: true,
    pillKey: "SocketConnecting",
    titleKey: "SocketConnecting",
    descriptionKey: "SocketConnectingDescription",
  },
  [SocketStatus.Reconnecting]: {
    trigger:
      "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25",
    dot: "bg-amber-500",
    pulse: false,
    icon: Loader2,
    spin: true,
    pillKey: "SocketReconnecting",
    titleKey: "SocketReconnecting",
    descriptionKey: "SocketReconnectingDescription",
  },
  [SocketStatus.Offline]: {
    trigger:
      "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 dark:border-destructive/40 dark:bg-destructive/15 dark:hover:bg-destructive/25",
    dot: "bg-destructive",
    pulse: false,
    icon: WifiOff,
    spin: false,
    pillKey: "SocketOffline",
    titleKey: "SocketOffline",
    descriptionKey: "SocketOfflineDescription",
  },
};

interface SocketStatusIndicatorProps {
  status: SocketStatus;
  // Epoch milliseconds of the next scheduled retry, or null when no retry is
  // waiting — which, in a non-connected state, means one is already in flight.
  nextRetryAt: number | null;
  onReconnect: () => void;
}

export const SocketStatusIndicator: React.FC<SocketStatusIndicatorProps> = ({
  status,
  nextRetryAt,
  onReconnect,
}) => {
  const t = useTranslations();
  const [now, setNow] = useState(() => Date.now());

  // Only ticks while a retry is actually pending, so a healthy socket costs no
  // render per second.
  useEffect(() => {
    if (nextRetryAt === null) {
      return;
    }

    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(interval);
  }, [nextRetryAt]);

  const presentation = STATUS_PRESENTATION[status];
  const isConnected = status === SocketStatus.Connected;
  const StatusIcon = presentation.icon;
  const title = t(presentation.titleKey);
  const secondsUntilRetry =
    nextRetryAt === null
      ? null
      : Math.max(0, Math.ceil((nextRetryAt - now) / 1000));
  // Nothing to hurry along while the attempt is already running: no retry is
  // scheduled and the socket is mid-handshake.
  const isAttemptInFlight = !isConnected && nextRetryAt === null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Announced on change so the state of the room is not carried by colour
      alone, and so it reaches a user who never opens the popover. */}
      <span role="status" aria-live="polite" className="sr-only">
        {title}
      </span>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              aria-label={title}
              className={cn(
                "gap-2 rounded-full px-3 shadow-lg backdrop-blur-sm",
                presentation.trigger
              )}
            />
          }
        >
          {StatusIcon === null ? (
            <span className="relative flex size-2 shrink-0">
              {presentation.pulse ? (
                <span
                  className={cn(
                    "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                    presentation.dot
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative inline-flex size-2 rounded-full",
                  presentation.dot
                )}
              />
            </span>
          ) : (
            <StatusIcon
              className={cn("size-3.5", presentation.spin && "animate-spin")}
            />
          )}
          <span className="text-xs font-medium tabular-nums">
            {secondsUntilRetry === null
              ? t(presentation.pillKey)
              : `${t(presentation.pillKey)} ${secondsUntilRetry}s`}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" side="top" className="w-80">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-1.5 size-2.5 shrink-0 rounded-full",
                presentation.dot
              )}
            />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold leading-none">{title}</p>
              <p className="text-sm text-muted-foreground">
                {t(presentation.descriptionKey)}
              </p>
            </div>
          </div>
          {secondsUntilRetry === null ? null : (
            <p className="mt-3 text-xs tabular-nums text-muted-foreground">
              {t("SocketRetryIn", { seconds: secondsUntilRetry })}
            </p>
          )}
          {isConnected ? null : (
            <Button
              size="sm"
              className="mt-3 w-full"
              disabled={isAttemptInFlight}
              onClick={onReconnect}
            >
              <RefreshCw className="size-4" />
              {t("SocketReconnectNow")}
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
