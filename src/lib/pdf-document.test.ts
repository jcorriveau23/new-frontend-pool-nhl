import { describe, expect, it } from "vitest";

import { encodeImagePdf, PdfImagePage } from "./pdf-document";

const page = (
  pixelWidth = 4,
  pixelHeight = 3,
  cssHeight = 300,
): PdfImagePage => ({
  rgb: new Uint8Array(pixelWidth * pixelHeight * 3).fill(255),
  pixelWidth,
  pixelHeight,
  cssWidth: 400,
  cssHeight,
});

const META = {
  title: "Les Enragés du Plateau",
  generatedAt: "2026-10-15T13:05:00.000Z",
};

const write = async (pages: PdfImagePage[], meta = META) =>
  new TextDecoder("latin1").decode(await encodeImagePdf(pages, meta));

describe("encodeImagePdf", () => {
  it("writes a pdf 1.4 file that ends where a reader expects", async () => {
    const pdf = await write([page()]);

    expect(pdf.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdf.endsWith("%%EOF\n")).toBe(true);
  });

  /*
  The second line is a comment of bytes above 127, which is how a pdf tells
  anything moving it around that it is not a text file to be newline
  converted.
  */
  it("marks itself binary on the second line", async () => {
    const bytes = await encodeImagePdf([page()], META);
    const secondLine = bytes.slice(10, 14);

    expect([...secondLine].every((byte) => byte > 127)).toBe(true);
  });

  it("gives the page tree one child per page", async () => {
    const pdf = await write([page(), page(), page()]);

    expect(pdf).toContain("/Type /Pages /Kids [3 0 R 6 0 R 9 0 R] /Count 3");
    expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(3);
  });

  /*
  The one invariant that decides whether a file opens at all: every entry of
  the cross-reference table is a byte offset, and a reader seeks straight to
  it. One byte out and the document is not slightly wrong, it is unreadable.
  */
  it("points every cross-reference entry at the object it names", async () => {
    const pdf = await write([page(), page()]);
    const table = /xref\n0 (\d+)\n([\s\S]*?)trailer/.exec(pdf);

    expect(table).not.toBeNull();
    const size = Number(table![1]);
    const entries = table![2].trimEnd().split("\n");
    expect(entries).toHaveLength(size);

    // The head of the free list, which is fixed by the format.
    expect(entries[0]).toBe("0000000000 65535 f ");

    for (let id = 1; id < size; id += 1) {
      const offset = Number(entries[id].slice(0, 10));
      expect(pdf.slice(offset, offset + `${id} 0 obj`.length)).toBe(
        `${id} 0 obj`,
      );
    }
  });

  it("every entry of the table is the twenty bytes a reader indexes by", async () => {
    const pdf = await write([page()]);
    const entries = /xref\n0 \d+\n([\s\S]*?)trailer/
      .exec(pdf)![1]
      .slice(0, -1)
      .split("\n");

    for (const entry of entries) {
      expect(`${entry}\n`).toHaveLength(20);
    }
  });

  it("declares a size one past the highest object", async () => {
    const pdf = await write([page(), page()]);
    const size = Number(/\/Size (\d+)/.exec(pdf)![1]);
    const highest = Math.max(
      ...[...pdf.matchAll(/^(\d+) 0 obj$/gm)].map((match) => Number(match[1])),
    );

    expect(size).toBe(highest + 1);
  });

  it("starts the cross-reference table where the trailer says it does", async () => {
    const pdf = await write([page()]);
    const startxref = Number(/startxref\n(\d+)/.exec(pdf)![1]);

    expect(pdf.slice(startxref, startxref + 4)).toBe("xref");
  });

  describe("the pages", () => {
    it("sizes each one from its css pixels, at three quarters of a point", async () => {
      const pdf = await write([page(4, 3, 300)]);

      // 400 x 300 css pixels at 96 per inch is 300 x 225 points.
      expect(pdf).toContain("/MediaBox [0 0 300 225]");
    });

    it("lets a short last page be short rather than padding it", async () => {
      const pdf = await write([page(4, 3, 300), page(4, 3, 120)]);

      expect(pdf).toContain("/MediaBox [0 0 300 225]");
      expect(pdf).toContain("/MediaBox [0 0 300 90]");
    });

    it("places the image over the whole page", async () => {
      const pdf = await write([page(4, 3, 300)]);

      expect(pdf).toContain("q 300 0 0 225 0 0 cm /Im0 Do Q");
    });

    it("describes the bitmap as deflated rgb of the size it is", async () => {
      const pdf = await write([page(8, 5)]);

      expect(pdf).toContain(
        "/Subtype /Image /Width 8 /Height 5 /ColorSpace /DeviceRGB",
      );
      expect(pdf).toContain("/BitsPerComponent 8 /Filter /FlateDecode");
    });

    it("compresses the samples rather than writing them raw", async () => {
      const bytes = await encodeImagePdf([page(200, 200)], META);

      // 200 x 200 x 3 is 120,000 bytes of flat white, which deflates to
      // almost nothing. A file anywhere near that size is uncompressed.
      expect(bytes.length).toBeLessThan(10_000);
    });

    it("writes a zlib stream, which is what FlateDecode means", async () => {
      const bytes = await encodeImagePdf([page()], META);
      const pdf = new TextDecoder("latin1").decode(bytes);
      const at = pdf.indexOf("/Filter /FlateDecode");
      const streamAt = pdf.indexOf("stream\n", at) + "stream\n".length;

      expect(bytes[streamAt]).toBe(0x78);
    });
  });

  describe("the document information", () => {
    /*
    Hex UTF-16 rather than a literal string: the other encoding a pdf offers
    is PDFDocEncoding, which would mangle every accented pool name.
    */
    it("carries an accented title without mangling it", async () => {
      const pdf = await write([page()]);
      const title = /\/Title <([0-9A-F]+)>/.exec(pdf);

      expect(title).not.toBeNull();
      const hex = title![1];
      expect(hex.startsWith("FEFF")).toBe(true);

      const decoded = (hex.slice(4).match(/.{4}/g) ?? [])
        .map((unit) => String.fromCharCode(parseInt(unit, 16)))
        .join("");
      expect(decoded).toBe("Les Enragés du Plateau");
    });

    it("carries a character outside the basic plane as a surrogate pair", async () => {
      const pdf = await write([page()], { ...META, title: "Pool 🏒" });
      const hex = /\/Title <([0-9A-F]+)>/.exec(pdf)![1];

      expect(hex.endsWith("D83CDFD2")).toBe(true);
    });

    it("writes the creation date in utc, in the only syntax pdf has", async () => {
      const pdf = await write([page()]);

      expect(pdf).toContain("/CreationDate (D:20261015130500+00'00')");
    });

    it("falls back to now rather than writing an invalid date", async () => {
      const pdf = await write([page()], { ...META, generatedAt: "not a date" });

      expect(pdf).toMatch(/\/CreationDate \(D:\d{14}\+00'00'\)/);
    });
  });

  it("refuses to write a document with no pages", async () => {
    await expect(encodeImagePdf([], META)).rejects.toThrow("at least one page");
  });
});
