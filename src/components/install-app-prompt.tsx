"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { DownloadIcon, ShareIcon, SquarePlusIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Chrome fires this instead of showing its own install UI once we call
// preventDefault(). It is not in lib.dom yet.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "install-prompt-dismissed";

/**
 * "Prompt" is Chrome and friends, where the browser hands us an install event.
 * "Instructions" is iOS Safari, which has no install API at all — the only way
 * in is the share sheet, so all we can do is explain where it is.
 */
type InstallMethod = "prompt" | "instructions";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS predates the display-mode media query and uses this instead.
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true)
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function InstallAppPrompt() {
  const t = useTranslations();
  const [method, setMethod] = React.useState<InstallMethod | null>(null);
  const [showInstructions, setShowInstructions] = React.useState(false);
  const promptEvent = React.useRef<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    // Already installed, or the user closed the banner before: stay quiet.
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY) === "true") {
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      promptEvent.current = event as BeforeInstallPromptEvent;
      setMethod("prompt");
    };

    const onInstalled = () => {
      promptEvent.current = null;
      setMethod(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (isIos()) {
      setMethod("instructions");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setMethod(null);
  };

  const install = async () => {
    if (method === "instructions") {
      setShowInstructions(true);
      return;
    }

    const event = promptEvent.current;
    if (!event) {
      return;
    }

    await event.prompt();
    const { outcome } = await event.userChoice;
    // The event is single use: a declined prompt cannot be replayed, so the
    // banner has nothing left to offer either way.
    promptEvent.current = null;
    if (outcome === "accepted") {
      setMethod(null);
    } else {
      dismiss();
    }
  };

  if (method === null) {
    return null;
  }

  return (
    <>
      <div
        data-install-banner
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight">
              {t("InstallAppTitle")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {t("InstallAppDescription")}
            </p>
          </div>
          <Button size="sm" onClick={install}>
            <DownloadIcon />
            {t("Install")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("Dismiss")}
            onClick={dismiss}
          >
            <XIcon />
          </Button>
        </div>
      </div>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("InstallAppTitle")}</DialogTitle>
            <DialogDescription>
              {t("InstallAppIosIntroduction")}
            </DialogDescription>
          </DialogHeader>
          <ol className="flex flex-col gap-3 text-sm">
            <li className="flex items-center gap-3">
              <ShareIcon className="size-5 shrink-0 text-primary" />
              <span>{t("InstallAppIosStepShare")}</span>
            </li>
            <li className="flex items-center gap-3">
              <SquarePlusIcon className="size-5 shrink-0 text-primary" />
              <span>{t("InstallAppIosStepAdd")}</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
