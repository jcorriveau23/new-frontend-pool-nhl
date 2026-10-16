"use client";

/*
Takes the pool out of the app.

One menu for every kind of pool: the screen hands this a function that builds
an `ExportDocument` and the entries below are the ways that document can
leave — a pdf of the whole thing, a csv for a spreadsheet, the report as a
page, and any one table as a png to drop in a chat.

The document is built on demand and then kept for as long as the menu is
open. Building one means a pass over the pool's rosters and a season of daily
scores, and nothing should pay for that because a page rendered — but the
image submenu has to name the tables before anything is picked, so the first
thing that needs the document builds it and the rest reuse it.
*/

import * as React from "react";
import {
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CSV_MIME,
  documentTables,
  ExportDocument,
  exportFileName,
  HTML_MIME,
  LabelledTable,
  toCsv,
  toHtml,
} from "@/lib/export-document";
import { downloadBlob, downloadTextFile } from "@/lib/export-download";
import { buildImagePdf } from "@/lib/pdf-document";
import {
  renderSheetPages,
  renderTableImage,
  TableImageError,
} from "@/lib/table-image";
import { cn } from "@/lib/utils";

interface Props {
  // Called when a format is picked, never on render.
  build: () => ExportDocument;
  // What the downloaded files are named after, which is the pool's own name.
  baseName: string;
  className?: string;
}

export default function ExportButton({ build, baseName, className }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  // Held for the life of one menu session, and dropped when it closes so the
  // next one reads a pool that has moved since.
  const built = React.useRef<ExportDocument | null>(null);
  const [tables, setTables] = React.useState<LabelledTable[] | null>(null);

  const exportDocument = () => {
    built.current ??= build();
    return built.current;
  };

  const report = (error: unknown) => {
    /*
    A table the browser would not draw is something the organiser can act on,
    so it is worded for them. Anything else is a bug they cannot act on, and
    is named rather than swallowed into a click that does nothing.
    */
    if (error instanceof TableImageError) {
      toast.error(t("ExportImageFailed"), { duration: 6000 });
      return;
    }

    toast.error(
      t("ExportFailed", {
        error: error instanceof Error ? error.message : String(error),
      }),
      { duration: 5000 },
    );
  };

  /*
  Every entry does the same four things: build the document, name the file,
  write it, say so — and any of them can fail for a reason only the toast can
  explain. Only the writing differs, so only the writing is passed in.
  */
  const save = async (
    extension: string,
    write: (doc: ExportDocument, filename: string) => void | Promise<void>,
    suffix?: string,
  ) => {
    try {
      const doc = exportDocument();
      const filename = exportFileName(
        baseName,
        extension,
        doc.generatedAt,
        suffix,
      );

      await write(doc, filename);
      toast.success(t("ExportDownloaded", { filename }));
    } catch (error) {
      report(error);
    }
  };

  const footerOf = (doc: ExportDocument) =>
    `slapshot.xyz · ${doc.generatedAt.slice(0, 10)}`;

  /*
  The whole pool as a pdf.

  Pages of pixels rather than text, which is the trade for not needing a
  print dialog: the sheet is drawn and cut into pages, so a pool nobody could
  fit in one bitmap is simply more pages. Anybody who wants selectable text
  can print the report page instead.
  */
  const savePdf = () =>
    save("pdf", async (doc, filename) => {
      const pages = await renderSheetPages(
        documentTables(doc).map((entry) => ({
          table: entry.table,
          heading: entry.label,
          note: entry.table.note,
        })),
        {
          title: baseName,
          subtitle: doc.meta
            .map((entry) => `${entry.label}: ${entry.value}`)
            .join(" · "),
          footer: footerOf(doc),
        },
      );

      downloadBlob(
        filename,
        await buildImagePdf(pages, {
          title: doc.title,
          generatedAt: doc.generatedAt,
        }),
      );
    });

  /*
  One table as a png.

  The pool's name is the heading rather than the table's: an image posted in
  a chat has to say which pool it is from, and the table's own heading and
  note go on the line under it.
  */
  const saveImage = (entry: LabelledTable) =>
    save(
      "png",
      async (doc, filename) =>
        downloadBlob(
          filename,
          await renderTableImage(entry.table, {
            title: baseName,
            subtitle: [entry.label, entry.table.note]
              .filter((part) => part)
              .join(" · "),
            footer: footerOf(doc),
          }),
        ),
      entry.key,
    );

  // The submenu cannot list the tables without the document, so opening it is
  // what builds one. Failing here leaves the list empty rather than throwing
  // through the menu's own open handler.
  const loadTables = (open: boolean) => {
    if (!open || tables !== null) {
      return;
    }
    try {
      setTables(documentTables(exportDocument()));
    } catch (error) {
      report(error);
      setTables([]);
    }
  };

  const label = t("ExportPool", { pool: baseName });

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) {
          built.current = null;
          setTables(null);
        }
      }}
    >
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
              <Download className="text-muted-foreground" />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t("ExportMenuTitle")}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => void savePdf()}>
            <FileText />
            {t("ExportPdf")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              void save("csv", (doc, filename) =>
                downloadTextFile(filename, CSV_MIME, toCsv(doc)),
              )
            }
          >
            <FileSpreadsheet />
            {t("ExportCsv")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              void save("html", (doc, filename) =>
                downloadTextFile(filename, HTML_MIME, toHtml(doc, locale)),
              )
            }
          >
            <FileCode2 />
            {t("ExportHtml")}
          </DropdownMenuItem>
          <DropdownMenuSub onOpenChange={loadTables}>
            <DropdownMenuSubTrigger>
              <ImageIcon />
              {t("ExportImage")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-80 w-60 overflow-auto">
              {tables === null ? (
                <DropdownMenuItem disabled>
                  {t("ExportPreparing")}
                </DropdownMenuItem>
              ) : tables.length === 0 ? (
                <DropdownMenuItem disabled>
                  {t("ExportNoTable")}
                </DropdownMenuItem>
              ) : (
                tables.map((entry) => (
                  <DropdownMenuItem
                    key={entry.key}
                    onClick={() => void saveImage(entry)}
                  >
                    {entry.label}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
