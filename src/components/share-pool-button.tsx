"use client";

import * as React from "react";
import { Link2, Mail, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  FacebookIcon,
  MessengerIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/brand-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Messenger has no open web share endpoint: the Send Dialog is the only one
// that works in a desktop browser and it requires a registered Facebook app.
// Without that id the entry falls back to the app deep link, which only ever
// resolves on a phone, so it is hidden elsewhere rather than left as a dead
// menu item.
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

interface Props {
  poolName: string;
  className?: string;
}

// Shares the current pool page. On devices that expose the Web Share API the
// first entry hands off to the OS sheet (Messenger, Instagram, SMS, ...), the
// explicit targets below are what desktop browsers get.
export default function SharePoolButton({ poolName, className }: Props) {
  const t = useTranslations();
  // navigator is not there during SSR, and gating on it at render time would
  // desync the first client render. Resolved after mount instead.
  const [platform, setPlatform] = React.useState({
    nativeShare: false,
    mobile: false,
  });

  React.useEffect(() => {
    setPlatform({
      nativeShare: !!navigator.share,
      mobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    });
  }, []);

  const label = t("SharePool", { pool: poolName });
  const message = t("SharePoolInvite", { pool: poolName });

  const currentUrl = () => window.location.href;

  const open = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareNatively = async () => {
    try {
      await navigator.share({
        title: poolName,
        text: message,
        url: currentUrl(),
      });
    } catch (error) {
      // Dismissing the OS sheet rejects with AbortError, that is not a failure.
      if ((error as Error)?.name !== "AbortError") {
        toast.error(t("ShareFailed"));
      }
    }
  };

  const shareOnMessenger = () => {
    const url = encodeURIComponent(currentUrl());
    if (FACEBOOK_APP_ID) {
      open(
        `https://www.facebook.com/dialog/send?app_id=${FACEBOOK_APP_ID}&link=${url}&redirect_uri=${url}`,
      );
      return;
    }
    window.location.href = `fb-messenger://share/?link=${url}`;
  };

  const shareOnWhatsApp = () => {
    open(
      `https://wa.me/?text=${encodeURIComponent(`${message} ${currentUrl()}`)}`,
    );
  };

  const shareOnFacebook = () => {
    open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl())}`,
    );
  };

  const shareOnX = () => {
    open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(currentUrl())}`,
    );
  };

  const shareByEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(poolName)}&body=${encodeURIComponent(`${message}\n\n${currentUrl()}`)}`;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl());
      toast.success(t("LinkCopied"));
    } catch {
      toast.error(t("ShareFailed"));
    }
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("size-8 shrink-0", className)}
                  aria-label={label}
                />
              }
            >
              <Share2 className="text-muted-foreground" />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuGroup>
          {platform.nativeShare ? (
            <DropdownMenuItem onClick={shareNatively}>
              <Share2 />
              {t("ShareMore")}
            </DropdownMenuItem>
          ) : null}
          {FACEBOOK_APP_ID || platform.mobile ? (
            <DropdownMenuItem onClick={shareOnMessenger}>
              <MessengerIcon />
              Messenger
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={shareOnWhatsApp}>
            <WhatsAppIcon />
            WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareOnFacebook}>
            <FacebookIcon />
            Facebook
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareOnX}>
            <XIcon />X
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareByEmail}>
            <Mail />
            {t("ShareByEmail")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={copyLink}>
            <Link2 />
            {t("CopyLink")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
