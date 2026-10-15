/*
What a pool looks like once it is taken out of the app.

A pool lives in a screen built out of tabs, tables and charts, none of which
leave the browser. What people ask of it does: a sheet to post on a wall at the end of the
season, a spreadsheet to pivot in Excel, a picture to drop in a group chat.
Rather than write an exporter per format, every screen builds one
`ExportDocument` — a title, a header block and a list of tables — and each
output is a function of that one shape.

The serializers here are the text ones. `@/lib/table-image` draws the same
document on a canvas and `@/lib/pdf-document` binds those pages into a pdf,
both from this model and neither known to it.
*/

// The subset of next-intl's `t` these builders need, taken as a parameter the
// way the settings forms do it: the wording stays translated by the caller's
// translator, and the rules stay testable without rendering anything.
export type Translator = (
  key: string,
  values?: Record<string, number | string>,
) => string;

/*
One value in a table.

Numbers stay numbers all the way through — it is what lets the csv be summed
in a spreadsheet and the printable page right-align a column without being
told which ones are numeric. Null is "nothing to say here", which is not the
same as zero and is why no caller formats it to "0" or "-" on the way in.
*/
export type ExportCell = string | number | boolean | null;

export interface ExportTable {
  // Stable, so it can key the json payload and anchor a link in the report.
  key: string;
  title: string;
  // One line under the heading, for what the columns cannot say.
  note?: string;
  columns: string[];
  rows: ExportCell[][];
}

export interface ExportSection {
  key: string;
  title: string;
  description?: string;
  tables: ExportTable[];
}

// A label/value pair of the header block: the pool's name, its season, who
// owns it — what somebody looking at the sheet a year later needs to place it.
export interface ExportMetaEntry {
  label: string;
  value: ExportCell;
}

export interface ExportDocument {
  title: string;
  subtitle?: string;
  meta: ExportMetaEntry[];
  sections: ExportSection[];
  // ISO 8601. In the footer of the report and in the filename.
  generatedAt: string;
}

/*
Which columns hold numbers, decided per column rather than per cell.

A column is numeric when every value it actually has is a number, so a column
of totals with a few blanks still right-aligns while one mixing "12" with
"traded" does not. Used by the report for alignment, and nowhere else: the csv
writes each cell for what it is.
*/
export function numericColumns(table: ExportTable): boolean[] {
  return table.columns.map((_column, index) => {
    const values = table.rows
      .map((row) => row[index])
      .filter((cell) => cell !== null && cell !== undefined && cell !== "");

    return (
      values.length > 0 && values.every((cell) => typeof cell === "number")
    );
  });
}

/*
A filename somebody can find again.

The pool's own name, stripped to what every filesystem accepts — accents
decomposed rather than dropped, so "Les Enragés" stays readable as
"les-enrages" instead of becoming "les-enrag" — then the day it was taken, so
two exports of the same pool a month apart do not overwrite each other in the
downloads folder.
*/
export function slugify(value: string): string {
  const ascii = value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  return (
    ascii
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "export"
  );
}

export function exportFileName(
  baseName: string,
  extension: string,
  generatedAt: string,
  // Which part of the pool this file holds, for the exports that are one
  // table rather than the whole document.
  suffix?: string,
): string {
  // The ISO date, not the local one: the filename is part of the archive and
  // should not depend on where it was taken.
  const day = generatedAt.slice(0, 10);
  const parts = [slugify(baseName), suffix ? slugify(suffix) : null, day];

  return `${parts.filter((part) => part !== null).join("-")}.${extension}`;
}

/*
A cell as a person reads it.

Shared by the printable report and the table images, so the same roster does
not read one way on paper and another in a screenshot. The csv is the one
output that does not use it: a spreadsheet wants an empty cell and a bare
number, not a dash and a tick.
*/
export function cellText(cell: ExportCell): string {
  if (cell === null || cell === undefined || cell === "") {
    // An em dash rather than a blank: an empty cell in a printed table reads
    // as a mistake, and these tables have a lot of legitimately empty cells.
    return "—";
  }
  if (typeof cell === "boolean") {
    return cell ? "✓" : "—";
  }
  return String(cell);
}

/* ------------------------------------------------------------------- csv  */

export const CSV_MIME = "text/csv;charset=utf-8";

/*
Excel reads a csv as the system codepage unless the file opens with a byte
order mark, which turns every accented participant name into mojibake on a
Windows machine. Every other reader skips the mark, so it is cheaper to always
write it than to explain the import dialog to anybody.
*/
const BOM = "﻿";

/*
A cell, escaped.

Two separate problems. Quoting is RFC 4180 and uncontroversial: anything
holding a separator, a quote or a newline gets wrapped, and its quotes are
doubled.

The leading apostrophe is the other one. A spreadsheet reads a cell opening
with `=`, `+`, `-` or `@` as a formula, and participant names, pool names and
player names in this file were all typed by somebody. A name of `=1+1` is
harmless; the same trick naming a command is not, and the person it would run
on is the organiser who exported their own pool. Numbers are written from the
number branch below, so a negative total is never caught by this.
*/
function csvCell(cell: ExportCell): string {
  if (cell === null || cell === undefined) {
    return "";
  }
  if (typeof cell === "number") {
    return Number.isFinite(cell) ? String(cell) : "";
  }
  if (typeof cell === "boolean") {
    return cell ? "true" : "false";
  }

  const value = /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;

  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const csvRow = (cells: ExportCell[]): string => cells.map(csvCell).join(",");

/*
What to head a table with, given the section it is in.

Several sections hold exactly one table, and the natural name for the section
and for its table are then the same word — "Trades" under "Trades". The table
keeps its own title for the sections where it says something more ("Draft" /
"Draft picks"), and the repetition is dropped where it does not.
*/
const tableHeading = (section: ExportSection, table: ExportTable): string =>
  table.title === section.title
    ? section.title
    : `${section.title} — ${table.title}`;

/*
Every table of the document in one file.

A csv holds one table and a pool is a dozen, so the alternative was a download
per table or a zip — one asks the organiser to click twelve times, the other
asks this module to implement the zip format. Instead each table is written
under its own title row with a blank line around it, which is how spreadsheets
have carried stacked tables for as long as they have existed: the sheet opens
with everything in it, and selecting a block is a drag.

CRLF, because that is what RFC 4180 says and what the spreadsheets that are
strictest about it expect.
*/
export function toCsv(doc: ExportDocument): string {
  const lines: string[] = [csvRow([doc.title])];

  if (doc.subtitle) {
    lines.push(csvRow([doc.subtitle]));
  }
  for (const entry of doc.meta) {
    lines.push(csvRow([entry.label, entry.value]));
  }

  for (const section of doc.sections) {
    for (const table of section.tables) {
      lines.push("");
      // The section name is repeated into every one of its tables rather than
      // written once above them: a title row scrolled past tells nobody which
      // section they are in, and these files are read by scrolling.
      lines.push(csvRow([tableHeading(section, table)]));
      lines.push(csvRow(table.columns));
      for (const row of table.rows) {
        lines.push(csvRow(row));
      }
    }
  }

  return BOM + lines.join("\r\n") + "\r\n";
}

/*
The sections of a document, with the empty ones dropped.

Every builder assembles its document the same way: name the sections it could
have, ask each for its tables, and keep the ones that came back with any. A
pool in the lobby has no standings and no trades, and a section with no table
under it is a heading over nothing.

Written once here rather than as the same seven-line closure in each builder.
*/
export function keepSections(
  specs: {
    key: string;
    title: string;
    description?: string;
    tables: (ExportTable | null)[];
  }[],
): ExportSection[] {
  return specs
    .map((spec) => ({
      ...spec,
      tables: spec.tables.filter(
        (table): table is ExportTable => table !== null,
      ),
    }))
    .filter((section) => section.tables.length > 0);
}

/*
Every table of the document, with the heading it is shown under.

What the "save a table as an image" menu lists: one entry per table, in the
order the report lays them out.
*/
export interface LabelledTable {
  key: string;
  label: string;
  table: ExportTable;
}

export function documentTables(doc: ExportDocument): LabelledTable[] {
  return doc.sections.flatMap((section) =>
    section.tables.map((table) => ({
      key: table.key,
      label: tableHeading(section, table),
      table,
    })),
  );
}

/* ------------------------------------------------------------------ html  */

export const HTML_MIME = "text/html;charset=utf-8";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const htmlCell = (cell: ExportCell): string => escapeHtml(cellText(cell));

const htmlTable = (section: ExportSection, table: ExportTable): string => {
  const numeric = numericColumns(table);
  const head = table.columns
    .map(
      (column, index) =>
        `<th${numeric[index] ? ' class="num"' : ""}>${escapeHtml(column)}</th>`,
    )
    .join("");

  const body =
    table.rows.length === 0
      ? `<tr><td class="empty" colspan="${table.columns.length}"></td></tr>`
      : table.rows
          .map(
            (row) =>
              `<tr>${table.columns
                .map(
                  (_column, index) =>
                    `<td${numeric[index] ? ' class="num"' : ""}>${htmlCell(
                      row[index] ?? null,
                    )}</td>`,
                )
                .join("")}</tr>`,
          )
          .join("");

  return [
    `<section class="table" id="${escapeHtml(table.key)}">`,
    table.title === section.title ? "" : `<h3>${escapeHtml(table.title)}</h3>`,
    table.note ? `<p class="note">${escapeHtml(table.note)}</p>` : "",
    // `display: table-header-group` on the thead is what makes the column
    // headers repeat at the top of every printed page; without it a roster
    // running over a page break turns into a block of unlabelled numbers. The
    // row around the cells is what makes that work: a thead holding bare
    // `th`s is invalid, and the repetition is a property of the row.
    `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`,
    `</section>`,
  ].join("");
};

/*
The stylesheet, inline.

The report has to be one file: it is emailed, dropped in a shared folder and
opened from a downloads directory years later, and anything it fetches at open
time is a broken report. That rules out the app's own stylesheet, so this is a
deliberately small sheet written for paper — light, hairline rules, and page
breaks where a table would otherwise be cut in half.
*/
const REPORT_STYLE = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0 auto;
  padding: 32px 24px 64px;
  max-width: 1100px;
  background: #fff;
  color: #18181b;
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
h1 { margin: 0 0 4px; font-size: 26px; letter-spacing: -0.01em; }
h2 {
  margin: 36px 0 4px;
  padding-bottom: 6px;
  border-bottom: 2px solid #18181b;
  font-size: 18px;
}
h3 { margin: 20px 0 6px; font-size: 14px; font-weight: 600; }
.subtitle { margin: 0; color: #52525b; font-size: 14px; }
.meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px 20px;
  margin: 20px 0 0;
  padding: 14px 16px;
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  background: #fafafa;
}
.meta div { display: flex; flex-direction: column; gap: 1px; }
.meta dt { color: #71717a; font-size: 11px; text-transform: uppercase;
  letter-spacing: 0.04em; }
.meta dd { margin: 0; font-weight: 600; }
.contents { margin: 20px 0 0; padding: 0; list-style: none;
  columns: 2; column-gap: 24px; break-after: avoid; }
.contents li { margin: 0 0 2px; font-size: 13px; }
.contents a { color: #18181b; text-decoration: none; }
.contents a::before { content: "— "; color: #a1a1aa; }
.note { margin: 0 0 6px; color: #71717a; font-size: 12px; }
.description { margin: 6px 0 0; color: #52525b; font-size: 13px; }
.table { break-inside: avoid; }
table { width: 100%; border-collapse: collapse; margin: 0 0 4px;
  font-variant-numeric: tabular-nums; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th, td {
  padding: 4px 8px;
  border-bottom: 1px solid #e4e4e7;
  text-align: left;
  vertical-align: top;
}
th { border-bottom: 1px solid #a1a1aa; color: #3f3f46; font-size: 11px;
  text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
td.num, th.num { text-align: right; }
tbody tr:nth-child(even) { background: #fafafa; }
td.empty::after { content: "—"; color: #a1a1aa; }
footer { margin-top: 36px; padding-top: 10px; border-top: 1px solid #e4e4e7;
  color: #71717a; font-size: 11px; }
footer a { color: inherit; }
@page { margin: 14mm; }
@media print {
  body { padding: 0; max-width: none; font-size: 10.5px; }
  h1 { font-size: 20px; }
  h2 { margin-top: 20px; font-size: 15px; }
  .contents { display: none; }
  th, td { padding: 2px 5px; }
}
`;

/*
When the report was taken, for its footer.

The full ISO string down to the millisecond is provenance nobody reads; the
minute is enough to tell two exports of the same afternoon apart, and the zone
is named because the report outlives the machine it was taken on.
*/
const stamp = (generatedAt: string): string =>
  `${generatedAt.slice(0, 16).replace("T", " ")} UTC`;

/*
The printable report: one self-contained page, which is also the pdf.

`lang` carries the locale the document was built in, so a browser hyphenates
and a screen reader pronounces a French report as French — the tables are
translated, and a page that does not say so is half translated.
*/
export function toHtml(doc: ExportDocument, locale: string = "en"): string {
  const meta = doc.meta
    .map(
      (entry) =>
        `<div><dt>${escapeHtml(entry.label)}</dt><dd>${htmlCell(
          entry.value,
        )}</dd></div>`,
    )
    .join("");

  // Worth nothing on a two-table report, and the only way through a twenty
  // pooler one. Dropped from the printed copy, where a list of links is dead
  // weight — the headings are what somebody leafing through reads.
  const contents =
    doc.sections.length > 1
      ? `<ul class="contents">${doc.sections
          .map(
            (section) =>
              `<li><a href="#${escapeHtml(section.key)}">${escapeHtml(
                section.title,
              )}</a></li>`,
          )
          .join("")}</ul>`
      : "";

  const sections = doc.sections
    .map((section) =>
      [
        `<h2 id="${escapeHtml(section.key)}">${escapeHtml(section.title)}</h2>`,
        section.description
          ? `<p class="description">${escapeHtml(section.description)}</p>`
          : "",
        section.tables.map((table) => htmlTable(section, table)).join(""),
      ].join(""),
    )
    .join("");

  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(doc.title)}</title>
<style>${REPORT_STYLE}</style>
</head>
<body>
<h1>${escapeHtml(doc.title)}</h1>
${doc.subtitle ? `<p class="subtitle">${escapeHtml(doc.subtitle)}</p>` : ""}
<dl class="meta">${meta}</dl>
${contents}
${sections}
<footer>Slapshot · slapshot.xyz · ${escapeHtml(stamp(doc.generatedAt))}</footer>
</body>
</html>
`;
}
