"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ExternalLinkIcon, MoreHorizontalIcon, XIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  androidAppLinkIntentUrl,
  detectInAppBrowser,
  detectMobilePlatform,
  type InAppBrowser,
} from "@/lib/in-app-browser";
import { cn } from "@/lib/utils";

/*
Shown when a shared pool link was opened inside a social app's webview, where
signing up cannot be completed at all — see `lib/in-app-browser.ts` for why.

Dismissal is per session, not remembered the way the install banner's is. This
banner is the only way out of the webview, so a permanent "no" would strand the
user on the next invite link too; sessionStorage dies with the webview instead.
*/
const DISMISSED_KEY = "in-app-browser-dismissed";

/*
What a webview offers as a way out, which is also how much we can do about it:

  - `android`: a real escape. The link goes back to Android as an intent and
    resolves to the installed app, or the default browser if there is none.
  - `ios`: no programmatic path exists — a home screen PWA registers no
    universal links and a webview cannot hand off to Safari — so all that is
    left is to point at the menu item that does it.
*/
type Escape = "android" | "ios";

// Meta names its own apps in the UI, so the banner can too. Anything else is
// detected without being identified, and the copy stays generic.
const APP_NAMES: Partial<Record<InAppBrowser, string>> = {
  messenger: "Messenger",
  facebook: "Facebook",
  instagram: "Instagram",
  threads: "Threads",
};

/*
A webview with site data blocked throws on the first storage access rather than
returning null. Unguarded that would throw inside the effect below and take the
page down with it — in the one browser this component exists to rescue.
*/
function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export default function OpenInBrowserBanner() {
  const t = useTranslations();
  // `navigator` is not there during SSR, and reading it at render time would
  // desync the first client render. Resolved after mount, as elsewhere.
  const [trap, setTrap] = React.useState<{
    app: InAppBrowser;
    escape: Escape;
    intentUrl: string | null;
  } | null>(null);
  const [showInstructions, setShowInstructions] = React.useState(false);

  React.useEffect(() => {
    if (wasDismissed()) {
      return;
    }

    const userAgent = window.navigator.userAgent;
    const app = detectInAppBrowser(userAgent);
    if (app === null) {
      return;
    }

    const platform = detectMobilePlatform(userAgent);
    if (platform === "other") {
      // A desktop webview: neither way out applies, so there is nothing to say.
      return;
    }

    const intentUrl =
      platform === "android"
        ? androidAppLinkIntentUrl(window.location.href)
        : null;

    // On Android the banner is only worth showing if the handoff could be
    // built. Without it the button would do nothing at all.
    if (platform === "android" && intentUrl === null) {
      return;
    }

    setTrap({ app, escape: platform, intentUrl });
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Storage blocked: the banner still closes for this render, which is all
      // the user asked for.
    }
    setTrap(null);
  };

  if (trap === null) {
    return null;
  }

  const appName = APP_NAMES[trap.app] ?? t("InAppBrowserGenericApp");

  return (
    <>
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t p-3 shadow-lg backdrop-blur">
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
              {trap.escape === "android"
                ? t("InAppBrowserAndroidTitle")
                : t("InAppBrowserIosTitle")}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {t("InAppBrowserDescription", { app: appName })}
            </p>
          </div>
          {trap.escape === "android" && trap.intentUrl !== null ? (
            /*
            A real anchor rather than a click handler that assigns
            `location.href`. A webview decides for itself whether to forward
            `intent://`, and a plain link navigation is the form it is most
            likely to hand to Android.
            */
            <a
              href={trap.intentUrl}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <ExternalLinkIcon />
              {t("InAppBrowserOpen")}
            </a>
          ) : (
            <Button size="sm" onClick={() => setShowInstructions(true)}>
              <ExternalLinkIcon />
              {t("InAppBrowserHow")}
            </Button>
          )}
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
            <DialogTitle>{t("InAppBrowserIosTitle")}</DialogTitle>
            <DialogDescription>
              {t("InAppBrowserIosIntroduction", { app: appName })}
            </DialogDescription>
          </DialogHeader>
          <ol className="flex flex-col gap-3 text-sm">
            <li className="flex items-center gap-3">
              <MoreHorizontalIcon className="text-primary size-5 shrink-0" />
              <span>{t("InAppBrowserIosStepMenu")}</span>
            </li>
            <li className="flex items-center gap-3">
              <ExternalLinkIcon className="text-primary size-5 shrink-0" />
              <span>{t("InAppBrowserIosStepOpen")}</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
