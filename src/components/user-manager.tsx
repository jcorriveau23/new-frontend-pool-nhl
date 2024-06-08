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
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { useUserData } from "@/hooks/useUserData";
import LogoutBtn from "./hanko/logout-button";
import { useSessionData } from "@/hooks/useSessionData";

export function UserManager() {
  const t = useTranslations();
  const router = useRouter();
  const {
    id,
    email,
    loading: userDataLoading,
    error: userDataError,
  } = useUserData();
  const {
    userID,
    jwt,
    isValid,
    loading: sessionDataLoading,
    error: sessionDataError,
  } = useSessionData();

  return isValid ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <UserIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <LogoutBtn />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>
      <LogInIcon />
    </Button>
  );
}
