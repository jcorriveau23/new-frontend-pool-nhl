"use client";
import * as React from "react";
import { LogInIcon, UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserContext } from "@/context/user-context";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";

export function UserManager() {
  const { user, disconnectUser } = useUserContext();
  const t = useTranslations();
  const router = useRouter();

  return user ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <UserIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            disconnectUser();
          }}
        >
          {t("Disconnect")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>
      <LogInIcon />
    </Button>
  );
}
