import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

// Shown for unmatched routes under a locale, and whenever a page calls
// `notFound()`. Renders inside the locale layout, so the app chrome is kept.
export default async function LocaleNotFound() {
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-lg">
      <Alert className="text-left">
        <FileQuestion className="size-4" />
        <AlertTitle>{t("PageNotFoundTitle")}</AlertTitle>
        <AlertDescription>{t("PageNotFoundDescription")}</AlertDescription>
      </Alert>
      <div className="mt-4 flex justify-center">
        <Button variant="outline" render={<Link href="/" />}>
          {t("BackToHome")}
        </Button>
      </div>
    </div>
  );
}
