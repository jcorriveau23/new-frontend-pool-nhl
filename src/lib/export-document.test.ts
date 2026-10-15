import { describe, expect, it } from "vitest";

import {
  CSV_MIME,
  ExportDocument,
  ExportTable,
  exportFileName,
  HTML_MIME,
  numericColumns,
  slugify,
  toCsv,
  toHtml,
} from "./export-document";

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

const doc = (overrides: Partial<ExportDocument> = {}): ExportDocument => ({
  title: "Les Boys — pool report",
  subtitle: "Generated on 2026-10-14",
  meta: [
    { label: "Season", value: "2026-27" },
    { label: "Poolers", value: 8 },
  ],
  sections: [
    { key: "section-standings", title: "Standings", tables: [table()] },
  ],
  generatedAt: "2026-10-14T13:05:00.000Z",
  ...overrides,
});

describe("mime types", () => {
  it("names a charset, so a downloaded file is not read as latin-1", () => {
    for (const mime of [CSV_MIME, HTML_MIME]) {
      expect(mime).toContain("charset=utf-8");
    }
  });
});

describe("numericColumns", () => {
  it("marks a column numeric only when every value it has is a number", () => {
    expect(numericColumns(table())).toEqual([true, false, true]);
  });

  it("ignores blanks, so a column of totals with holes still counts", () => {
    const sparse = table({
      rows: [
        [1, "Alice", 120],
        [2, "Bob", null],
        [3, "Cat", ""],
      ],
    });

    expect(numericColumns(sparse)[2]).toBe(true);
  });

  it("does not call a column with no values at all numeric", () => {
    expect(numericColumns(table({ rows: [] }))).toEqual([false, false, false]);
  });

  it("rejects a column that mixes numbers with text", () => {
    const mixed = table({
      rows: [
        [1, "Alice", 120],
        [2, "Bob", "traded"],
      ],
    });

    expect(numericColumns(mixed)[2]).toBe(false);
  });
});

describe("slugify", () => {
  it("keeps an accented pool name readable", () => {
    expect(slugify("Les Enragés du Plateau")).toBe("les-enrages-du-plateau");
  });

  it("collapses whatever a filesystem would refuse", () => {
    expect(slugify("Pool #1 / 2026 (final!)")).toBe("pool-1-2026-final");
  });

  it("falls back rather than producing an empty filename", () => {
    expect(slugify("////")).toBe("export");
    expect(slugify("")).toBe("export");
  });

  it("caps the length, so a pasted paragraph cannot become a filename", () => {
    expect(slugify("a".repeat(200))).toHaveLength(60);
  });
});

describe("exportFileName", () => {
  it("carries the pool name and the day it was taken", () => {
    expect(exportFileName("Les Boys", "csv", "2026-10-14T13:05:00.000Z")).toBe(
      "les-boys-2026-10-14.csv",
    );
  });
});

describe("toCsv", () => {
  const lines = (document: ExportDocument) =>
    toCsv(document).replace(/^﻿/, "").split("\r\n");

  it("opens with a byte order mark, which is what Excel reads utf-8 by", () => {
    expect(toCsv(doc()).startsWith("﻿")).toBe(true);
  });

  it("writes the header block, then each table under its own title", () => {
    expect(lines(doc())).toEqual([
      "Les Boys — pool report",
      "Generated on 2026-10-14",
      "Season,2026-27",
      "Poolers,8",
      "",
      "Standings — Total ranking",
      "Rank,Pooler,Points",
      "1,Alice,120",
      "2,Bob,95",
      "",
    ]);
  });

  /*
  Several sections hold one table, and the natural name for both is then the
  same word. Writing it twice was what the first generated report actually
  read like: "Trades — Trades".
  */
  it("writes one heading where the table repeats its section's name", () => {
    const same = doc({
      sections: [
        { key: "s", title: "Trades", tables: [table({ title: "Trades" })] },
      ],
    });

    expect(lines(same)).toContain("Trades");
    expect(lines(same)).not.toContain("Trades — Trades");
  });

  it("quotes a value holding a separator, a quote or a newline", () => {
    const awkward = table({
      columns: ["Pooler", "Note"],
      rows: [
        ["Tremblay, Jean", 'said "no"'],
        ["Line\nbreak", null],
      ],
    });

    expect(
      lines(doc({ sections: [{ key: "s", title: "S", tables: [awkward] }] })),
    ).toContain('"Tremblay, Jean","said ""no"""');
  });

  /*
  The one that is not cosmetic. Pool, pooler and player names are typed by
  people, and a spreadsheet runs a cell opening with `=` as a formula on the
  machine of whoever opened the file — which is the organiser exporting their
  own pool.
  */
  it("defuses a name a spreadsheet would run as a formula", () => {
    const injected = table({
      columns: ["Pooler"],
      rows: [["=1+1"], ["+HYPERLINK(1)"], ["@SUM(A1)"], ["-2+3"]],
    });
    const written = lines(
      doc({ sections: [{ key: "s", title: "S", tables: [injected] }] }),
    );

    expect(written).toContain("'=1+1");
    expect(written).toContain("'+HYPERLINK(1)");
    expect(written).toContain("'@SUM(A1)");
    expect(written).toContain("'-2+3");
  });

  it("leaves a negative number alone, since it is written as a number", () => {
    const totals = table({ columns: ["Points"], rows: [[-12]] });

    expect(
      lines(doc({ sections: [{ key: "s", title: "S", tables: [totals] }] })),
    ).toContain("-12");
  });

  it("writes blanks for nothing-to-say and booleans as words", () => {
    const flags = table({
      columns: ["Pooler", "Account", "Points"],
      rows: [
        ["Alice", true, null],
        ["Bob", false, Number.NaN],
      ],
    });
    const written = lines(
      doc({ sections: [{ key: "s", title: "S", tables: [flags] }] }),
    );

    expect(written).toContain("Alice,true,");
    expect(written).toContain("Bob,false,");
  });

  it("ends every line with CRLF, as RFC 4180 asks", () => {
    expect(toCsv(doc()).endsWith("\r\n")).toBe(true);
  });
});

describe("toHtml", () => {
  it("is one self-contained document that fetches nothing", () => {
    const html = toHtml(doc());

    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<style>");
    expect(html).not.toMatch(/<link[^>]+href/);
    expect(html).not.toMatch(/<script/);
  });

  it("wraps the header cells in a row, which is what repeats them when printed", () => {
    expect(toHtml(doc())).toContain('<thead><tr><th class="num">Rank</th>');
  });

  it("stamps the footer to the minute rather than the millisecond", () => {
    expect(toHtml(doc())).toContain("2026-10-14 13:05 UTC");
  });

  it("carries the locale it was built in", () => {
    expect(toHtml(doc(), "fr")).toContain('<html lang="fr">');
    expect(toHtml(doc())).toContain('<html lang="en">');
  });

  it("repeats table headers across printed pages and keeps rows whole", () => {
    const html = toHtml(doc());

    expect(html).toContain("display: table-header-group");
    expect(html).toContain("break-inside: avoid");
    expect(html).toContain("@page");
  });

  it("right-aligns the numeric columns and only those", () => {
    const html = toHtml(doc());

    expect(html).toContain('<th class="num">Rank</th>');
    expect(html).toContain("<th>Pooler</th>");
  });

  it("escapes everything that came from a person", () => {
    const hostile = doc({
      title: "<script>alert(1)</script>",
      sections: [
        {
          key: "s",
          title: "S",
          tables: [
            table({
              columns: ["Pooler"],
              rows: [['Bob" onmouseover="x']],
            }),
          ],
        },
      ],
    });
    const html = toHtml(hostile);

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Bob&quot; onmouseover=&quot;x");
  });

  it("shows a dash where a cell has nothing to say", () => {
    const sparse = doc({
      sections: [
        {
          key: "s",
          title: "S",
          tables: [
            table({ columns: ["Pooler", "Out"], rows: [["Alice", null]] }),
          ],
        },
      ],
    });

    expect(toHtml(sparse)).toContain("<td>—</td>");
  });

  it("renders a boolean as a tick rather than the word", () => {
    const flags = doc({
      sections: [
        {
          key: "s",
          title: "S",
          tables: [
            table({
              columns: ["Pooler", "Account"],
              rows: [
                ["Alice", true],
                ["Bob", false],
              ],
            }),
          ],
        },
      ],
    });
    const html = toHtml(flags);

    expect(html).toContain("<td>✓</td>");
    expect(html).toContain("<td>—</td>");
  });

  it("drops a sub-heading that repeats the section's own heading", () => {
    const same = doc({
      sections: [
        { key: "s", title: "Trades", tables: [table({ title: "Trades" })] },
      ],
    });
    const html = toHtml(same);

    expect(html).toContain('<h2 id="s">Trades</h2>');
    expect(html).not.toContain("<h3>Trades</h3>");
    // One that says something more keeps its own.
    expect(toHtml(doc())).toContain("<h3>Total ranking</h3>");
  });

  it("offers a contents list only when there is more than one section", () => {
    expect(toHtml(doc())).not.toContain('class="contents"');

    const twoSections = doc({
      sections: [
        { key: "one", title: "One", tables: [table()] },
        { key: "two", title: "Two", tables: [table({ key: "t2" })] },
      ],
    });
    const html = toHtml(twoSections);

    expect(html).toContain('class="contents"');
    expect(html).toContain('href="#two"');
    expect(html).toContain('<h2 id="two">Two</h2>');
  });

  it("renders a table's note and a section's description", () => {
    const annotated = doc({
      sections: [
        {
          key: "s",
          title: "S",
          description: "What this holds",
          tables: [table({ note: "Standing as of 2026-10-14" })],
        },
      ],
    });
    const html = toHtml(annotated);

    expect(html).toContain("Standing as of 2026-10-14");
    expect(html).toContain("What this holds");
  });

  it("renders a table with no rows as an empty table rather than broken markup", () => {
    const empty = doc({
      sections: [{ key: "s", title: "S", tables: [table({ rows: [] })] }],
    });

    expect(toHtml(empty)).toContain('<td class="empty" colspan="3">');
  });
});
