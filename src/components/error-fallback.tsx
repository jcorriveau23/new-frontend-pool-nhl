"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  // Provided by the `error.tsx` boundary: re-fetches and re-renders the
  // segment. Absent when the fallback is rendered outside a boundary.
  retry?: () => void;
}

/*
Shared fallback UI for the route error boundaries.

Errors thrown by Server Components reach the client with a generic message and
a `digest` used to match the server logs, so the digest is surfaced to let a
user report something actionable. Client Component errors keep their original
message, which is shown as-is.
*/
export function ErrorFallback({ error, retry }: ErrorFallbackProps) {
  const t = useTranslations();

  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg">
      <Alert variant="destructive" className="text-left">
        <AlertCircle className="size-4" />
        <AlertTitle>{t("ErrorTitle")}</AlertTitle>
        <AlertDescription className="space-y-1">
          <span>{t("UnexpectedErrorDescription")}</span>
          {error.digest ? (
            <span className="block font-mono text-xs opacity-80">
              {t("ErrorReference", { digest: error.digest })}
            </span>
          ) : null}
        </AlertDescription>
      </Alert>
      <div className="mt-4 flex justify-center gap-2">
        {retry ? (
          <Button variant="outline" onClick={() => retry()}>
            {t("Retry")}
          </Button>
        ) : null}
        <Button variant="ghost" render={<Link href="/" />}>
          {t("BackToHome")}
        </Button>
      </div>
    </div>
  );
}

export default ErrorFallback;
