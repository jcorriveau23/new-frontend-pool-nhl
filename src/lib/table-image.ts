/*
Tables as a picture, for the group chat.

The report and the csv are for keeping; this is for showing. Posting the
standings on a Saturday night means posting an image, and the alternative
everybody falls back to is a phone screenshot of a scrolling table — cropped,
half a column wide, unreadable a week later.

Drawn on a canvas rather than by rasterizing the page. Taking a picture of the
live DOM needs a library that re-implements CSS layout well enough to be
believed, and what it would produce is the screen — theme, hover state,
sticky headers and all. The table model is already here, so this lays it out
once, for one purpose, at twice the pixel density.

One sheet holds any number of tables, because a pool is asked for either way:
the standings alone to settle an argument, or the whole thing as one picture.
A sheet of one table is the same code path with one section in it.

The measuring and the arithmetic are separated from the drawing: layout is a
pure function of the text widths, which is what makes it testable without a
canvas, and `renderSheetImage` is the thin shell that measures, calls it and
paints.
*/
import {
  cellText,
  ExportCell,
  ExportTable,
  numericColumns,
} from "@/lib/export-document";
import { PdfImagePage } from "@/lib/pdf-document";

// Everything below is in CSS pixels. `scale` turns them into device pixels.
const PAGE_PADDING = 20;
const CELL_PADDING = 10;
const ROW_HEIGHT = 26;
const HEADER_HEIGHT = 30;
const TITLE_HEIGHT = 26;
const SUBTITLE_HEIGHT = 20;
const HEADING_HEIGHT = 24;
const NOTE_HEIGHT = 18;
const SECTION_GAP = 18;
const FOOTER_HEIGHT = 24;
const MIN_COLUMN_WIDTH = 40;
const MAX_COLUMN_WIDTH = 260;

const TITLE_FONT = "600 17px system-ui, -apple-system, sans-serif";
const SUBTITLE_FONT = "12px system-ui, -apple-system, sans-serif";
const HEADING_FONT = "600 13px system-ui, -apple-system, sans-serif";
const NOTE_FONT = "11px system-ui, -apple-system, sans-serif";
const HEADER_FONT = "600 11px system-ui, -apple-system, sans-serif";
export const CELL_FONT = "13px system-ui, -apple-system, sans-serif";
const FOOTER_FONT = "10px system-ui, -apple-system, sans-serif";

/*
What a canvas can actually hold.

A browser over either ceiling hands back a blank bitmap rather than an error,
so neither can be discovered by trying. The side is a hard limit every engine
shares. The area is not: a desktop allows hundreds of megapixels while an
older phone gives up around sixteen, and picking the phone's number for
everybody refused whole-pool sheets that a laptop draws without blinking.

So the budget here is generous and the canvas is asked afterwards whether it
really allocated — `probeAllocated` below. The budget keeps the absurd cases
from being attempted at all; the probe is what makes sure nothing blank is
ever handed over.
*/
const MAX_CANVAS_SIDE = 16_384;
const MAX_CANVAS_AREA = 64_000_000;

// Measures a run of text in one of the fonts above. `ctx.measureText` behind a
// function, so the layout can be tested with a ruler that counts characters.
export type Measure = (text: string, font: string) => number;

export interface ImageColumn {
  // Left edge of the column, including its padding.
  x: number;
  width: number;
  align: "left" | "right";
}

/*
One table on the sheet.

The heading is drawn above the table on a sheet that holds several. A sheet of
one does not need it — there the table's name is the sheet's subtitle, under
the pool's — so it is optional rather than always present.
*/
export interface ImageSection {
  table: ExportTable;
  heading?: string | null;
  note?: string | null;
}

export interface SectionLayout {
  headingY: number | null;
  noteY: number | null;
  headerY: number;
  rowYs: number[];
  columns: ImageColumn[];
  /*
  How wide this table's columns are, which the sheet can be wider than: it is
  as wide as its widest table, and a long heading can widen it further. The
  stripes and the rules are drawn to this rather than to the sheet, so they
  stop where each table does instead of trailing off into the margin.
  */
  tableWidth: number;
}

export interface SheetLayout {
  // In CSS pixels. The bitmap is these times `scale`.
  width: number;
  height: number;
  scale: number;
  titleY: number;
  subtitleY: number | null;
  footerY: number | null;
  sections: SectionLayout[];
}

export interface SheetImageOptions {
  // The pool's name: what makes a shared image say which pool it is from.
  title: string;
  // On a sheet of one table, the table's own heading and note.
  subtitle?: string | null;
  // Where the image came from and when, so one found months later can be
  // placed.
  footer?: string | null;
  // 2 on purpose: an image posted in a chat is looked at on a phone, where
  // one device pixel per CSS pixel is visibly soft.
  scale?: number;
}

/*
Shortens a run of text to fit, with an ellipsis.

Measured rather than counted: column widths come from the widest cell, so the
only text this ever has to cut is a cell over the maximum width — a long pool
name, a list of five players in a trade.
*/
export function ellipsize(
  text: string,
  maxWidth: number,
  font: string,
  measure: Measure,
): string {
  if (measure(text, font) <= maxWidth) {
    return text;
  }

  let kept = text;
  while (kept.length > 0 && measure(`${kept}…`, font) > maxWidth) {
    kept = kept.slice(0, -1);
  }

  return kept.length > 0 ? `${kept}…` : "";
}

const columnWidths = (table: ExportTable, measure: Measure): number[] =>
  table.columns.map((column, index) => {
    const widest = table.rows.reduce(
      (width, row) =>
        Math.max(width, measure(cellText(row[index] ?? null), CELL_FONT)),
      measure(column, HEADER_FONT),
    );

    return Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(MIN_COLUMN_WIDTH, Math.ceil(widest)) + CELL_PADDING * 2,
    );
  });

/*
Where everything goes.

The sheet is laid out top to bottom in one pass — title, each section in turn,
footer — and its width is settled afterwards from the widest thing in it.

The scale is chosen here rather than taken on faith: a long sheet at twice the
density is a bitmap a browser will refuse to allocate, and it refuses by
returning a blank one. So the density is dropped to 1 before anything is
dropped from the sheet, and one that does not fit even then is rejected
outright — `renderSheetImage` turns that into something the screen can say.
*/
export function sheetImageLayout(
  sections: ImageSection[],
  options: SheetImageOptions,
  measure: Measure,
): SheetLayout {
  let y = PAGE_PADDING;

  const titleY = y;
  y += TITLE_HEIGHT;

  let subtitleY: number | null = null;
  if (options.subtitle) {
    subtitleY = y;
    y += SUBTITLE_HEIGHT;
  }

  // Widest heading or note, which can push the sheet past its widest table.
  let textWidth = Math.max(
    measure(options.title, TITLE_FONT),
    options.subtitle ? measure(options.subtitle, SUBTITLE_FONT) : 0,
    options.footer ? measure(options.footer, FOOTER_FONT) : 0,
  );

  const laidOut: SectionLayout[] = sections.map((section) => {
    y += SECTION_GAP;

    let headingY: number | null = null;
    if (section.heading) {
      headingY = y;
      y += HEADING_HEIGHT;
      textWidth = Math.max(textWidth, measure(section.heading, HEADING_FONT));
    }

    let noteY: number | null = null;
    if (section.note) {
      noteY = y;
      y += NOTE_HEIGHT;
      textWidth = Math.max(textWidth, measure(section.note, NOTE_FONT));
    }

    const widths = columnWidths(section.table, measure);
    const numeric = numericColumns(section.table);

    let x = PAGE_PADDING;
    const columns: ImageColumn[] = widths.map((width, index) => {
      const column = {
        x,
        width,
        align: numeric[index] ? ("right" as const) : ("left" as const),
      };
      x += width;
      return column;
    });

    const headerY = y;
    y += HEADER_HEIGHT;

    const rowYs = section.table.rows.map(
      (_row, index) => y + index * ROW_HEIGHT,
    );
    y += section.table.rows.length * ROW_HEIGHT;

    return {
      headingY,
      noteY,
      headerY,
      rowYs,
      columns,
      tableWidth: widths.reduce((total, width) => total + width, 0),
    };
  });

  let footerY: number | null = null;
  if (options.footer) {
    y += 6;
    footerY = y;
    y += FOOTER_HEIGHT;
  }

  const height = Math.ceil(y + PAGE_PADDING);
  const width = Math.ceil(
    Math.max(textWidth, ...laidOut.map((section) => section.tableWidth), 0) +
      PAGE_PADDING * 2,
  );

  let scale = options.scale ?? 2;
  while (
    scale > 1 &&
    (width * scale > MAX_CANVAS_SIDE ||
      height * scale > MAX_CANVAS_SIDE ||
      width * height * scale * scale > MAX_CANVAS_AREA)
  ) {
    scale -= 1;
  }

  return {
    width,
    height,
    scale,
    titleY,
    subtitleY,
    footerY,
    sections: laidOut,
  };
}

const PNG_MIME = "image/png";

// Light on purpose, and not the app's theme: an image leaves the app and is
// looked at against a chat background that could be anything.
const INK = "#18181b";
const MUTED = "#71717a";
const RULE = "#e4e4e7";
const STRIPE = "#fafafa";

/*
A sheet the browser would not draw.

One class and no reason codes. There are three ways it happens — a context
refused, a bitmap too big to allocate, an encoder that gave nothing back —
and none of them is a different thing to tell somebody: the table cannot be
a picture, use the pdf or the spreadsheet. Three messages said that three
ways and the screen had to carry a lookup to pick between them.
*/
export class TableImageError extends Error {
  constructor(cause: string) {
    super(cause);
    this.name = "TableImageError";
  }
}

/*
Whether the canvas behind a context is real.

Reading one pixel back, which is cheap at any size — it is the allocation
being tested, not the drawing. `getImageData` can throw on a tainted canvas;
nothing here draws an image, so a throw is itself a canvas that is not usable
and is treated as one.
*/
function probeAllocated(context: CanvasRenderingContext2D): boolean {
  try {
    return context.getImageData(0, 0, 1, 1).data[3] !== 0;
  } catch {
    return false;
  }
}

/*
Paints the sheet and hands back a png.

The only part of the export that needs a canvas, which is why it is the only
part that can fail for a reason the caller cannot predict — a context the
browser would not give, a bitmap it would not encode.
*/
/*
Paints a band of the sheet onto a canvas of its own.

The whole sheet is one band; a page of a pdf is one of several. Drawing is
translated rather than re-laid-out, so every y in the layout means the same
thing on every page and a table cannot land in two places.
*/
async function paintBand(
  sections: ImageSection[],
  layout: SheetLayout,
  options: SheetImageOptions,
  top: number,
  bandHeight: number,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new TableImageError("no canvas context");
  }

  /*
  Two ways a bitmap fails to exist, and both are checked here so there is one
  place that decides whether something can be drawn.

  The budget first, because asking a browser for an absurd allocation is how
  a tab runs out of memory rather than how it says no. Then the probe below,
  because the budget is a guess: the real ceiling is the device's, a desktop
  allows far more than an old phone, and what a browser does when it is over
  is hand back a transparent bitmap and no error at all.
  */
  if (
    layout.width > MAX_CANVAS_SIDE ||
    bandHeight > MAX_CANVAS_SIDE ||
    layout.width * bandHeight > MAX_CANVAS_AREA
  ) {
    throw new TableImageError("bitmap too large");
  }

  canvas.width = Math.ceil(layout.width * layout.scale);
  canvas.height = Math.ceil(bandHeight * layout.scale);
  context.scale(layout.scale, layout.scale);

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, layout.width, bandHeight);

  // The background has just filled every pixel opaque, so one transparent
  // pixel means the allocation failed and everything below would be drawn
  // into nothing.
  if (!probeAllocated(context)) {
    throw new TableImageError("bitmap too large");
  }

  // From here on, the sheet's own coordinates.
  context.translate(0, -top);
  context.textBaseline = "middle";

  const measure: Measure = (text, font) => {
    context.font = font;
    return context.measureText(text).width;
  };

  const bottom = top + bandHeight;
  // A row wholly outside the band costs nothing to skip and would otherwise
  // be measured and ellipsized for every page of a long sheet.
  const onBand = (y: number) => y + ROW_HEIGHT >= top && y <= bottom;

  const line = (text: string, y: number, font: string, colour: string) => {
    context.fillStyle = colour;
    context.font = font;
    context.textAlign = "left";
    context.fillText(text, PAGE_PADDING, y);
  };

  const cell = (text: string, column: ImageColumn, y: number, font: string) => {
    context.font = font;
    const fitted = ellipsize(
      text,
      column.width - CELL_PADDING * 2,
      font,
      measure,
    );
    context.textAlign = column.align;
    context.fillText(
      fitted,
      column.align === "right"
        ? column.x + column.width - CELL_PADDING
        : column.x + CELL_PADDING,
      y,
    );
  };

  line(options.title, layout.titleY + TITLE_HEIGHT / 2, TITLE_FONT, INK);

  if (options.subtitle && layout.subtitleY !== null) {
    line(
      options.subtitle,
      layout.subtitleY + SUBTITLE_HEIGHT / 2,
      SUBTITLE_FONT,
      MUTED,
    );
  }

  sections.forEach((section, index) => {
    const placed = layout.sections[index];

    if (section.heading && placed.headingY !== null) {
      line(
        section.heading,
        placed.headingY + HEADING_HEIGHT / 2,
        HEADING_FONT,
        INK,
      );
    }
    if (section.note && placed.noteY !== null) {
      line(section.note, placed.noteY + NOTE_HEIGHT / 2, NOTE_FONT, MUTED);
    }

    // Stripes first, so everything else is painted on top of them.
    placed.rowYs.forEach((y, rowIndex) => {
      if (rowIndex % 2 === 1 && onBand(y)) {
        context.fillStyle = STRIPE;
        context.fillRect(PAGE_PADDING, y, placed.tableWidth, ROW_HEIGHT);
      }
    });

    context.fillStyle = INK;
    placed.columns.forEach((column, columnIndex) => {
      cell(
        section.table.columns[columnIndex],
        column,
        placed.headerY + HEADER_HEIGHT / 2,
        HEADER_FONT,
      );
    });

    // The rule under the header, which is what keeps a wide table readable.
    context.fillStyle = MUTED;
    context.fillRect(
      PAGE_PADDING,
      placed.headerY + HEADER_HEIGHT - 1,
      placed.tableWidth,
      1,
    );

    section.table.rows.forEach((row, rowIndex) => {
      if (!onBand(placed.rowYs[rowIndex])) {
        return;
      }
      const y = placed.rowYs[rowIndex] + ROW_HEIGHT / 2;
      placed.columns.forEach((column, columnIndex) => {
        context.fillStyle = INK;
        cell(
          cellText(row[columnIndex] ?? (null as ExportCell)),
          column,
          y,
          CELL_FONT,
        );
      });

      context.fillStyle = RULE;
      context.fillRect(
        PAGE_PADDING,
        placed.rowYs[rowIndex] + ROW_HEIGHT - 1,
        placed.tableWidth,
        1,
      );
    });
  });

  if (options.footer && layout.footerY !== null) {
    line(
      options.footer,
      layout.footerY + FOOTER_HEIGHT / 2,
      FOOTER_FONT,
      MUTED,
    );
  }

  return canvas;
}

/*
Paints the sheet and hands back a png.

The only part of the export that needs a canvas, which is why it is the only
part that can fail for a reason the caller cannot predict — a context the
browser would not give, a bitmap it would not encode.
*/
/*
One table as a png.

A sheet of one section, whose name goes in the subtitle rather than over the
table: with nothing to tell it apart from, a heading above a single table is
the same line twice.

The only single-bitmap output left, and so the only one with a ceiling — a
table of hundreds of rows comes back as a `TableImageError`. The pdf has no
such limit, because it is pages.
*/
export async function renderTableImage(
  table: ExportTable,
  options: SheetImageOptions,
): Promise<Blob> {
  const sections = [{ table }];
  const layout = measuredLayout(sections, options);
  const canvas = await paintBand(sections, layout, options, 0, layout.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new TableImageError("could not encode the bitmap"));
        return;
      }
      resolve(blob);
    }, PNG_MIME);
  });
}

/*
The layout, measured against a real canvas.

A throwaway context purely to measure text with: the fonts are the browser's
and the widths cannot be guessed, but nothing is drawn on it.
*/
function measuredLayout(
  sections: ImageSection[],
  options: SheetImageOptions,
): SheetLayout {
  const context = document.createElement("canvas").getContext("2d");
  if (context === null) {
    throw new TableImageError("no canvas context");
  }

  return sheetImageLayout(sections, options, (text, font) => {
    context.font = font;
    return context.measureText(text).width;
  });
}

/*
Proportions of a printed page.

The sheet is as wide as its widest table, which is not a paper size, so the
page is given the A-series ratio from that width — it prints without a reader
having to scale anything, and the pages come out the shape people expect.
Bounded, so a very narrow sheet does not turn into a ribbon and a very wide
one does not become a page nobody can read across.
*/
const PAGE_ASPECT = Math.SQRT2;
const MIN_PAGE_HEIGHT = 900;
const MAX_PAGE_HEIGHT = 2400;

export function sheetPageHeight(layout: SheetLayout): number {
  return Math.round(
    Math.min(
      MAX_PAGE_HEIGHT,
      Math.max(MIN_PAGE_HEIGHT, layout.width * PAGE_ASPECT),
    ),
  );
}

/*
Where to cut the sheet into pages.

Returns the y each page begins at, the first always 0. Cuts are only made
where one would not slice through something: between two rows of a table, or
between one table and the next. The furthest legal cut within a page is taken,
so pages are as full as they can be.

A single unbreakable run taller than a whole page — a table whose header and
first row alone overflow — is cut at the page boundary rather than refused.
That cannot happen at any page size this module picks, and silently producing
a shorter document would be worse than an ugly cut if it ever did.
*/
export function sheetPageBreaks(
  layout: SheetLayout,
  pageHeight: number,
): number[] {
  const cuts = layout.sections
    .flatMap((section) => [
      // Between rows, never above the first: that would orphan the header.
      ...section.rowYs.slice(1),
      // And after the table, before whatever follows it.
      (section.rowYs.at(-1) ?? section.headerY) + ROW_HEIGHT,
    ])
    .sort((left, right) => left - right);

  const breaks = [0];
  let start = 0;

  while (layout.height - start > pageHeight) {
    const limit = start + pageHeight;
    const legal = cuts.filter((cut) => cut > start && cut <= limit);
    const next = legal.at(-1) ?? limit;

    breaks.push(next);
    start = next;
  }

  return breaks;
}

/*
The sheet as pages of pixels, for `buildImagePdf`.

Each page is its own canvas, so no single bitmap is ever taller than a page —
which is what takes the ceiling off: a sheet that could never be one image is
simply more pages.
*/
export async function renderSheetPages(
  sections: ImageSection[],
  options: SheetImageOptions,
): Promise<PdfImagePage[]> {
  const layout = measuredLayout(sections, options);
  const pageHeight = sheetPageHeight(layout);
  const breaks = sheetPageBreaks(layout, pageHeight);

  const pages: PdfImagePage[] = [];

  for (const [index, top] of breaks.entries()) {
    // The last page stops at the content rather than running on to a full
    // page of white.
    const height = (breaks[index + 1] ?? layout.height) - top;
    const canvas = await paintBand(sections, layout, options, top, height);
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new TableImageError("no canvas context");
    }

    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    // Dropping alpha: the page is opaque, and three channels is a quarter
    // less to deflate and to carry in the file.
    const rgb = new Uint8Array((data.length / 4) * 3);
    for (let from = 0, to = 0; from < data.length; from += 4, to += 3) {
      rgb[to] = data[from];
      rgb[to + 1] = data[from + 1];
      rgb[to + 2] = data[from + 2];
    }

    pages.push({
      rgb,
      pixelWidth: canvas.width,
      pixelHeight: canvas.height,
      cssWidth: layout.width,
      cssHeight: height,
    });
  }

  return pages;
}
