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
import LogoutBtn from "./hanko/logout-button";
import { useSession } from "@/context/useSessionData";
import { LoadingSpinner } from "./ui/loading-spinner";
import { useSearchParams } from "next/navigation";

export function UserManager() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isValid, loading: sessionDataLoading } = useSession();

  if (sessionDataLoading) {
    return (
      <Button variant="ghost" size="sm">
        <LoadingSpinner />
      </Button>
    );
  }

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
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.push(`/login?${searchParams.toString()}`)}
    >
      <LogInIcon />
    </Button>
  );
}
