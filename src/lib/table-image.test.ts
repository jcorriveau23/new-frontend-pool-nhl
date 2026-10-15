import { afterEach, describe, expect, it, vi } from "vitest";

import { ExportTable } from "@/lib/export-document";
import {
  CELL_FONT,
  ellipsize,
  ImageSection,
  Measure,
  renderSheetPages,
  renderTableImage,
  sheetImageLayout,
  sheetPageBreaks,
  sheetPageHeight,
  SheetImageOptions,
  TableImageError,
} from "./table-image";

/*
A ruler that counts characters, so the layout can be checked without a canvas:
every glyph is 10 wide in the cell font and 8 in any of the smaller ones.
*/
const ruler: Measure = (text, font) =>
  text.length * (font === CELL_FONT ? 10 : 8);

const table = (overrides: Partial<ExportTable> = {}): ExportTable => ({
  key: "standings",
  title: "Total ranking",
  columns: ["Rank", "Pooler", "Points"],
  rows: [
    [1, "Alice", 120],
    [2, "Bob", 95],
  ],
  ...overrides,
});

const layoutOf = (
  sections: ImageSection[],
  options: Partial<SheetImageOptions> = {},
) => sheetImageLayout(sections, { title: "Les Boys", ...options }, ruler);

const oneTable = (
  overrides: Partial<ExportTable> = {},
  options: Partial<SheetImageOptions> = {},
) => layoutOf([{ table: table(overrides) }], options);

describe("ellipsize", () => {
  it("leaves text that fits alone", () => {
    expect(ellipsize("Alice", 100, CELL_FONT, ruler)).toBe("Alice");
  });

  it("cuts to what fits, with an ellipsis", () => {
    // 10 per glyph, so 45 holds three characters plus the ellipsis.
    expect(ellipsize("Tremblay", 45, CELL_FONT, ruler)).toBe("Tre…");
  });

  it("gives up rather than returning a bare ellipsis that does not fit", () => {
    expect(ellipsize("Tremblay", 5, CELL_FONT, ruler)).toBe("");
  });
});

describe("sheetImageLayout", () => {
  describe("a single table", () => {
    it("gives every column the width of its widest value", () => {
      const widths = oneTable().sections[0].columns.map(
        (column) => column.width,
      );

      // "Pooler" is 6 glyphs of header font (48) but "Alice" is 5 of cell
      // font (50), so the cell is what sets it — plus padding on both sides.
      expect(widths[1]).toBe(50 + 20);
      // "Points" is 48 of header against 30 of widest cell, so the header is.
      expect(widths[2]).toBe(48 + 20);
    });

    it("holds a column open to a minimum, so a lone digit is not a sliver", () => {
      const narrow = oneTable({ columns: ["#"], rows: [[1], [2]] });

      expect(narrow.sections[0].columns[0].width).toBe(40 + 20);
    });

    it("lays the columns out left to right without gaps", () => {
      const columns = oneTable().sections[0].columns;

      expect(columns[0].x).toBe(20);
      expect(columns[1].x).toBe(columns[0].x + columns[0].width);
      expect(columns[2].x).toBe(columns[1].x + columns[1].width);
    });

    it("right-aligns the numeric columns and only those", () => {
      expect(
        oneTable().sections[0].columns.map((column) => column.align),
      ).toEqual(["right", "left", "right"]);
    });

    it("caps a column rather than letting one cell set the whole width", () => {
      const wide = oneTable({ rows: [[1, "x".repeat(200), 120]] });

      expect(wide.sections[0].columns[1].width).toBe(260);
    });

    it("places one band per row, in order and evenly", () => {
      const placed = oneTable().sections[0];
      const gaps = placed.rowYs
        .slice(1)
        .map((y, index) => y - placed.rowYs[index]);

      expect(placed.rowYs).toHaveLength(2);
      expect(gaps).toEqual([26]);
      expect(placed.rowYs[0]).toBeGreaterThan(placed.headerY);
    });

    it("has no heading of its own: the sheet's subtitle is its name", () => {
      const placed = oneTable({}, { subtitle: "Total ranking" });

      expect(placed.sections[0].headingY).toBeNull();
      expect(placed.subtitleY).not.toBeNull();
    });

    it("leaves no room for a subtitle or a footer it was not given", () => {
      const bare = oneTable();

      expect(bare.subtitleY).toBeNull();
      expect(bare.footerY).toBeNull();

      const full = oneTable({}, { subtitle: "Standings", footer: "slapshot" });
      expect(full.subtitleY).not.toBeNull();
      expect(full.footerY).not.toBeNull();
      expect(full.height).toBeGreaterThan(bare.height);
    });

    /*
    A one-column table whose title is longer than the table itself: without
    this the heading would be drawn off the edge of the bitmap.
    */
    it("widens to fit a heading longer than the table", () => {
      const narrow = layoutOf(
        [{ table: table({ columns: ["#"], rows: [[1]] }) }],
        { title: "Les Enragés du Plateau — classement complet" },
      );

      expect(narrow.width).toBeGreaterThan(60 + 40);
    });

    it("keeps the columns' own width apart from the image's", () => {
      const wide = layoutOf(
        [{ table: table({ columns: ["#"], rows: [[1]] }) }],
        { title: "Les Enragés du Plateau — classement complet" },
      );

      // Sized by the heading, so the rules must not be drawn to the full
      // width.
      expect(wide.sections[0].tableWidth).toBe(60);
      expect(wide.width).toBeGreaterThan(wide.sections[0].tableWidth + 40);

      const ordinary = oneTable();
      expect(ordinary.sections[0].tableWidth).toBe(
        ordinary.sections[0].columns.reduce(
          (total, column) => total + column.width,
          0,
        ),
      );
    });
  });

  describe("several tables on one sheet", () => {
    const sheet = (options: Partial<SheetImageOptions> = {}) =>
      layoutOf(
        [
          { table: table(), heading: "Total ranking", note: "as of today" },
          {
            table: table({
              key: "trades",
              columns: ["Date", "Gave"],
              rows: [["2027-01-08", "Suzuki"]],
            }),
            heading: "Trades",
          },
        ],
        options,
      );

    it("stacks them down the page, each below the one before", () => {
      const placed = sheet();

      expect(placed.sections).toHaveLength(2);
      expect(placed.sections[1].headerY).toBeGreaterThan(
        placed.sections[0].rowYs.at(-1) ?? 0,
      );
    });

    it("gives each one its own heading, and its note under it", () => {
      const [first, second] = sheet().sections;

      expect(first.headingY).not.toBeNull();
      expect(first.noteY).toBeGreaterThan(first.headingY ?? 0);
      expect(first.headerY).toBeGreaterThan(first.noteY ?? 0);
      // The second has a heading but nothing to note.
      expect(second.headingY).not.toBeNull();
      expect(second.noteY).toBeNull();
    });

    it("is as wide as its widest table, and each table keeps its own width", () => {
      const placed = sheet();
      const widths = placed.sections.map((section) => section.tableWidth);

      expect(widths[0]).not.toBe(widths[1]);
      expect(placed.width).toBe(Math.max(...widths) + 40);
    });

    it("is taller than either table would be alone", () => {
      expect(sheet().height).toBeGreaterThan(oneTable().height);
    });

    it("leaves room for the footer under the last table", () => {
      const placed = sheet({ footer: "slapshot.xyz · 2026-10-15" });

      expect(placed.footerY).toBeGreaterThan(
        placed.sections[1].rowYs.at(-1) ?? 0,
      );
      expect(placed.height).toBeGreaterThan(placed.footerY ?? 0);
    });
  });

  it("draws at twice the pixel density, which is what a phone needs", () => {
    expect(oneTable().scale).toBe(2);
  });

  /*
  A browser over its bitmap ceiling hands back a blank canvas rather than an
  error, so the density is dropped before anything is dropped from the sheet.
  */
  it("drops to one device pixel rather than overflow the bitmap", () => {
    const tall = oneTable({
      rows: Array.from({ length: 4000 }, (_row, index) => [
        index,
        `Pooler ${index}`,
        index,
      ]),
    });

    expect(tall.height * 2).toBeGreaterThan(16_384);
    expect(tall.scale).toBe(1);
  });
});

describe("sheetPageHeight", () => {
  it("gives a page the A-series shape of the sheet's own width", () => {
    // Wide enough that the proportion, not the floor, decides: every column
    // at its cap.
    const wide = oneTable({
      rows: [["x".repeat(40), "y".repeat(40), "z".repeat(40)]],
    });

    expect(wide.width * Math.SQRT2).toBeGreaterThan(900);
    expect(sheetPageHeight(wide)).toBe(Math.round(wide.width * Math.SQRT2));
  });

  it("will not let a narrow sheet become a ribbon", () => {
    const narrow = layoutOf([
      { table: table({ columns: ["#"], rows: [[1]] }) },
    ]);

    expect(narrow.width * Math.SQRT2).toBeLessThan(900);
    expect(sheetPageHeight(narrow)).toBe(900);
  });
});

describe("sheetPageBreaks", () => {
  const tall = (rows: number) =>
    oneTable({
      rows: Array.from({ length: rows }, (_row, index) => [
        index,
        `Pooler ${index}`,
        index,
      ]),
    });

  it("is a single page when the sheet already fits", () => {
    expect(sheetPageBreaks(tall(3), 10_000)).toEqual([0]);
  });

  it("cuts a long sheet into pages that start where the last one stopped", () => {
    const layout = tall(200);
    const breaks = sheetPageBreaks(layout, 600);

    expect(breaks.length).toBeGreaterThan(5);
    expect(breaks[0]).toBe(0);
    // Ascending, and none of them past the end of the sheet.
    for (let i = 1; i < breaks.length; i += 1) {
      expect(breaks[i]).toBeGreaterThan(breaks[i - 1]);
    }
    expect(breaks.at(-1)).toBeLessThan(layout.height);
  });

  it("never cuts through a row", () => {
    const layout = tall(200);
    const rowTops = new Set(layout.sections[0].rowYs);

    for (const cut of sheetPageBreaks(layout, 600).slice(1)) {
      expect(rowTops.has(cut)).toBe(true);
    }
  });

  it("never orphans a header from its first row", () => {
    const layout = tall(200);
    const firstRow = layout.sections[0].rowYs[0];

    expect(sheetPageBreaks(layout, 600)).not.toContain(firstRow);
  });

  it("fills each page as far as it legally can", () => {
    const layout = tall(200);
    const breaks = sheetPageBreaks(layout, 600);

    // Every page holds as much as 600 allows: one more row would overflow.
    for (let i = 1; i < breaks.length; i += 1) {
      expect(breaks[i] - breaks[i - 1]).toBeLessThanOrEqual(600);
      expect(breaks[i] - breaks[i - 1]).toBeGreaterThan(600 - 26 - 1);
    }
  });

  it("may cut between two tables as well as between two rows", () => {
    const layout = layoutOf([
      { table: table(), heading: "One" },
      { table: table(), heading: "Two" },
    ]);
    const breaks = sheetPageBreaks(layout, 260);

    expect(breaks.length).toBeGreaterThan(1);
  });

  /*
  Cannot happen at any page height this module picks — a header and one row
  are under two hundred pixels — but a silently shorter document would be
  worse than an ugly cut if it ever did.
  */
  it("cuts at the boundary rather than give up on an unbreakable run", () => {
    const layout = tall(50);
    const breaks = sheetPageBreaks(layout, 40);

    expect(breaks.length).toBeGreaterThan(1);
    expect(breaks.at(-1)).toBeLessThan(layout.height);
  });
});

/*
The drawing itself.

jsdom has no 2d context, so one is faked — which is not only a workaround: it
is what lets the order of the painting be asserted at all. A real canvas would
only give back pixels.
*/
describe("painting", () => {
  interface FakeContext {
    calls: string[];
  }

  const stubCanvas = (
    options: {
      blob?: Blob | null;
      context?: boolean;
      // The bitmap the browser silently refused to allocate: every pixel
      // transparent however much is painted into it.
      allocated?: boolean;
      imageDataThrows?: boolean;
    } = {},
  ) => {
    const context = {
      calls: [] as string[],
      font: "",
      fillStyle: "",
      textAlign: "",
      textBaseline: "",
      measureText(text: string) {
        return { width: text.length * 10 };
      },
      scale(x: number, y: number) {
        context.calls.push(`scale(${x},${y})`);
      },
      translate(x: number, y: number) {
        context.calls.push(`translate(${x},${y})`);
      },
      fillRect(x: number, y: number, w: number, h: number) {
        context.calls.push(`rect(${Math.round(x)},${Math.round(y)},${w},${h})`);
      },
      fillText(text: string, x: number) {
        context.calls.push(`text(${text}@${Math.round(x)})`);
      },
      getImageData(_x: number, _y: number, width: number, height: number) {
        if (options.imageDataThrows) {
          throw new Error("tainted");
        }
        const alpha = options.allocated === false ? 0 : 255;
        const data = new Uint8ClampedArray(
          Math.max(1, width * height) * 4,
        ).fill(200);
        // The probe reads the first pixel's alpha and nothing else.
        data[3] = alpha;
        return { data };
      },
    };

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () =>
        (options.context === false
          ? null
          : context) as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => {
        callback(
          options.blob === undefined
            ? new Blob(["png"], { type: "image/png" })
            : options.blob,
        );
      },
    );

    return context as unknown as FakeContext;
  };

  const written = (context: FakeContext) =>
    context.calls
      .filter((call) => call.startsWith("text("))
      .map((call) => call.slice(5).split("@")[0]);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hands back a png", async () => {
    stubCanvas();

    const blob = await renderTableImage(table(), { title: "Les Boys" });

    expect(blob.type).toBe("image/png");
  });

  it("writes the heading, the column names, then every cell", async () => {
    const context = stubCanvas();

    await renderTableImage(table(), {
      title: "Les Boys",
      subtitle: "Total ranking",
      footer: "slapshot.xyz · 2026-10-15",
    });

    expect(written(context)).toEqual([
      "Les Boys",
      "Total ranking",
      "Rank",
      "Pooler",
      "Points",
      "1",
      "Alice",
      "120",
      "2",
      "Bob",
      "95",
      "slapshot.xyz · 2026-10-15",
    ]);
  });

  it("writes one sheet through its tables in order, each under its heading", async () => {
    const context = stubCanvas();

    await renderSheetPages(
      [
        {
          table: table({ columns: ["Rank"], rows: [[1]] }),
          heading: "Standings",
        },
        {
          table: table({ columns: ["Date"], rows: [["2027-01-08"]] }),
          heading: "Trades",
          note: "oldest first",
        },
      ],
      { title: "Les Boys", footer: "slapshot.xyz" },
    );

    expect(written(context)).toEqual([
      "Les Boys",
      "Standings",
      "Rank",
      "1",
      "Trades",
      "oldest first",
      "Date",
      "2027-01-08",
      "slapshot.xyz",
    ]);
  });

  it("reads a cell the same way the printable report does", async () => {
    const context = stubCanvas();

    await renderTableImage(
      table({
        columns: ["Pooler", "Account"],
        rows: [
          ["Alice", true],
          ["Bob", null],
        ],
      }),
      { title: "Les Boys" },
    );

    const calls = context.calls.join(" ");
    expect(calls).toContain("text(✓@");
    expect(calls).toContain("text(—@");
  });

  it("scales the bitmap up and paints a background under everything", async () => {
    const context = stubCanvas();

    await renderTableImage(table(), { title: "Les Boys" });

    expect(context.calls[0]).toBe("scale(2,2)");
    expect(context.calls[1]).toMatch(/^rect\(0,0,/);
  });

  /*
  All three come back as the same class, because they are the same thing to
  tell somebody: this cannot be a picture. The messages below are for whoever
  reads a stack trace, not for the screen.
  */
  it("says so when the browser will not give it a canvas", async () => {
    stubCanvas({ context: false });

    await expect(
      renderTableImage(table(), { title: "Les Boys" }),
    ).rejects.toThrow("no canvas context");
  });

  /*
  The budget, which is checked before a browser is asked for the allocation:
  asking for an absurd one is how a tab runs out of memory rather than how it
  says no. A table of a hundred thousand rows is taller than any bitmap.
  */
  it("refuses a sheet too large to be a bitmap before trying to make one", async () => {
    stubCanvas();

    await expect(
      renderTableImage(
        table({
          rows: Array.from({ length: 100_000 }, (_row, i) => [i, "x", 1]),
        }),
        { title: "Les Boys" },
      ),
    ).rejects.toThrow("too large");
  });

  /*
  The whole reason the area budget can be generous: a desktop draws sheets an
  old phone cannot, and the one thing that must never happen is handing over
  a blank png as though it worked.
  */
  it("refuses a bitmap the browser only pretended to allocate", async () => {
    stubCanvas({ allocated: false });

    await expect(
      renderTableImage(table(), { title: "Les Boys" }),
    ).rejects.toThrow("too large");
  });

  it("treats a canvas it cannot read back as one it cannot use", async () => {
    stubCanvas({ imageDataThrows: true });

    await expect(
      renderTableImage(table(), { title: "Les Boys" }),
    ).rejects.toThrow("too large");
  });

  it("says so when the bitmap cannot be encoded", async () => {
    stubCanvas({ blob: null });

    await expect(
      renderTableImage(table(), { title: "Les Boys" }),
    ).rejects.toThrow("could not encode");
  });

  describe("as pages, for a pdf", () => {
    it("is one page when the sheet already fits", async () => {
      stubCanvas();

      const pages = await renderSheetPages([{ table: table() }], {
        title: "Les Boys",
      });

      expect(pages).toHaveLength(1);
    });

    /*
    What takes the ceiling off: no single bitmap is ever taller than a page,
    so a sheet that could never be one image is simply more of them.
    */
    it("cuts a long sheet into several, none taller than a page", async () => {
      stubCanvas();

      const rows = Array.from({ length: 400 }, (_row, index) => [
        index,
        `Pooler ${index}`,
        index,
      ]);
      const pages = await renderSheetPages([{ table: table({ rows }) }], {
        title: "Les Boys",
      });

      expect(pages.length).toBeGreaterThan(1);
      const tallest = Math.max(...pages.map((page) => page.cssHeight));
      expect(tallest).toBeLessThanOrEqual(
        sheetPageHeight(
          layoutOf([{ table: table({ rows }) }], { title: "Les Boys" }),
        ),
      );
    });

    it("gives every page the sheet's width and its own height", async () => {
      stubCanvas();

      const rows = Array.from({ length: 400 }, (_row, index) => [
        index,
        "x",
        1,
      ]);
      const pages = await renderSheetPages([{ table: table({ rows }) }], {
        title: "Les Boys",
      });

      expect(new Set(pages.map((page) => page.cssWidth)).size).toBe(1);
      // The last one stops at the content rather than running on to a full
      // page of white.
      expect(pages.at(-1)!.cssHeight).toBeLessThan(pages[0].cssHeight);
    });

    it("hands over three channels rather than four", async () => {
      stubCanvas();

      const [page] = await renderSheetPages([{ table: table() }], {
        title: "Les Boys",
      });

      expect(page.rgb).toHaveLength(page.pixelWidth * page.pixelHeight * 3);
    });

    it("sizes the bitmap at the sheet's device pixels", async () => {
      stubCanvas();

      const [page] = await renderSheetPages([{ table: table() }], {
        title: "Les Boys",
      });

      expect(page.pixelWidth).toBe(Math.ceil(page.cssWidth * 2));
      expect(page.pixelHeight).toBe(Math.ceil(page.cssHeight * 2));
    });

    it("says so when the browser will not give it a canvas", async () => {
      stubCanvas({ context: false });

      await expect(
        renderSheetPages([{ table: table() }], { title: "Les Boys" }),
      ).rejects.toThrow("no canvas context");
    });
  });

  it("fails with an error the screen can tell apart from a bug", async () => {
    stubCanvas({ context: false });

    await expect(
      renderTableImage(table(), { title: "Les Boys" }),
    ).rejects.toBeInstanceOf(TableImageError);
  });
});
