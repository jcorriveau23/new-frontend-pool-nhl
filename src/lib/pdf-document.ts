/*
A pdf holding one rendered page per sheet page.

Written by hand, which wants a word. The app already produces a pdf — the
printable report, through the browser's own print dialog — and that one is
better in every way that a pdf is usually judged: its text is selectable,
searchable and sharp at any zoom. This is not a replacement for it.

What it is instead is a download. The print dialog is three clicks and a
destination to choose on a laptop, and on a phone it is worse than that, so
"give me the file" was never actually on offer. These are pages of pixels,
exactly the picture the image export makes, wrapped in the container people
can open, page through, attach and print without being asked anything.

A pdf writer is a small thing when all it has to carry is images: a handful of
dictionaries, one stream per page and a table of byte offsets. There is no
font handling here, which is the part that makes pdf libraries large — the
text is already drawn into the bitmap. Nothing is embedded that a reader has
to resolve, so the file is as portable as a pdf gets.
*/

const PDF_MIME = "application/pdf";

export interface PdfImagePage {
  /*
  8 bits per channel, three channels, row major, no padding.

  Pinned to a plain `ArrayBuffer`: the default `Uint8Array` may be backed by a
  `SharedArrayBuffer`, which neither a stream writer nor `Blob` will take.
  Everything here allocates its own, so saying so costs nothing.
  */
  rgb: Uint8Array<ArrayBuffer>;
  pixelWidth: number;
  pixelHeight: number;
  // The page's size in CSS pixels. Points are 1/72 inch and CSS pixels are
  // 1/96, so the page is three quarters of its pixel size and the bitmap in
  // it lands at whatever density it was rendered at.
  cssWidth: number;
  cssHeight: number;
}

export interface PdfMeta {
  title: string;
  // ISO 8601. Becomes the document's creation date.
  generatedAt: string;
}

const CSS_PX_TO_POINTS = 72 / 96;

/*
Deflate, from the platform.

`CompressionStream("deflate")` emits the zlib wrapper that pdf's FlateDecode
expects, so the stream goes in as it comes out. Read through a reader rather
than through `Response` or `Blob.stream`, neither of which jsdom implements —
and this module is tested there.
*/
async function deflate(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new CompressionStream("deflate");
  const writer = stream.writable.getWriter();
  void writer.write(bytes);
  void writer.close();

  const reader = stream.readable.getReader();
  const parts: Uint8Array[] = [];

  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    parts.push(value);
    total += value.length;
  }

  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }

  return out;
}

/*
A text value, as UTF-16 big endian in hex.

The alternative is a literal `(string)`, which is PDFDocEncoding and would
mangle every accented pool name. Hex with a byte order mark is understood by
every reader and sidesteps escaping entirely.
*/
function pdfText(value: string): string {
  let hex = "FEFF";

  for (const unit of value) {
    const code = unit.codePointAt(0) ?? 0;
    if (code > 0xffff) {
      // Outside the basic plane, so it takes a surrogate pair — which is what
      // UTF-16 asks for and what `charCodeAt` over the string already gives.
      const offset = code - 0x10000;
      hex += (0xd800 + (offset >> 10)).toString(16).padStart(4, "0");
      hex += (0xdc00 + (offset & 0x3ff)).toString(16).padStart(4, "0");
      continue;
    }
    hex += code.toString(16).padStart(4, "0");
  }

  return `<${hex.toUpperCase()}>`;
}

// `D:YYYYMMDDHHmmSS'00'`, which is the only date syntax pdf has. Written in
// UTC, with the zero offset spelled out rather than left for a reader to
// guess at.
function pdfDate(generatedAt: string): string {
  const stamp = new Date(generatedAt);
  const at = Number.isNaN(stamp.getTime()) ? new Date() : stamp;
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    `D:${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}` +
    `${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}${pad(at.getUTCSeconds())}+00'00'`
  );
}

const round = (value: number) => Math.round(value * 100) / 100;

/*
Assembles the file.

Objects are numbered up front because the page tree has to name its children
before any of them is written, and every object's byte offset is recorded as
it goes out — that table at the end is the whole of how a reader finds
anything in a pdf, and an offset that is one byte wrong makes the file
unopenable rather than slightly wrong.
*/
export async function encodeImagePdf(
  pages: PdfImagePage[],
  meta: PdfMeta,
): Promise<Uint8Array<ArrayBuffer>> {
  if (pages.length === 0) {
    throw new Error("a pdf needs at least one page");
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  const offsets = new Map<number, number>();
  let length = 0;

  const put = (data: Uint8Array<ArrayBuffer> | string) => {
    const bytes = typeof data === "string" ? encoder.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };

  const startObject = (id: number) => {
    offsets.set(id, length);
    put(`${id} 0 obj\n`);
  };

  const endObject = () => put("endobj\n");

  const pageId = (index: number) => 3 + index * 3;
  const contentsId = (index: number) => 4 + index * 3;
  const imageId = (index: number) => 5 + index * 3;
  const infoId = 3 + pages.length * 3;

  // The binary comment on the second line is what tells a transfer that moves
  // files in text mode that this one is not text.
  put("%PDF-1.4\n%âãÏÓ\n");

  startObject(1);
  put("<< /Type /Catalog /Pages 2 0 R >>\n");
  endObject();

  const kids = pages.map((_page, index) => `${pageId(index)} 0 R`).join(" ");
  startObject(2);
  put(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\n`);
  endObject();

  for (const [index, page] of pages.entries()) {
    const width = round(page.cssWidth * CSS_PX_TO_POINTS);
    const height = round(page.cssHeight * CSS_PX_TO_POINTS);

    startObject(pageId(index));
    put(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
        `/Resources << /XObject << /Im0 ${imageId(index)} 0 R >> >> ` +
        `/Contents ${contentsId(index)} 0 R >>\n`,
    );
    endObject();

    /*
    The whole content stream: place the image over the page and stop.

    `cm` is the transform taking the image's unit square to the page, and a
    pdf image's first row of samples is its top edge — so a bitmap drawn top
    to bottom lands the right way up with no flip.
    */
    const content = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q\n`;
    startObject(contentsId(index));
    put(`<< /Length ${encoder.encode(content).length} >>\nstream\n`);
    put(content);
    put("endstream\n");
    endObject();

    const compressed = await deflate(page.rgb);
    startObject(imageId(index));
    put(
      `<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth} ` +
        `/Height ${page.pixelHeight} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /FlateDecode ` +
        `/Length ${compressed.length} >>\nstream\n`,
    );
    put(compressed);
    put("\nendstream\n");
    endObject();
  }

  startObject(infoId);
  put(
    `<< /Title ${pdfText(meta.title)} /Producer ${pdfText("Slapshot")} ` +
      `/CreationDate (${pdfDate(meta.generatedAt)}) >>\n`,
  );
  endObject();

  const size = infoId + 1;
  const xrefAt = length;

  put(`xref\n0 ${size}\n`);
  // Every entry is exactly twenty bytes, which is what lets a reader seek
  // straight to the one it wants.
  put("0000000000 65535 f \n");
  for (let id = 1; id < size; id += 1) {
    put(`${String(offsets.get(id) ?? 0).padStart(10, "0")} 00000 n \n`);
  }

  put(
    `trailer\n<< /Size ${size} /Root 1 0 R /Info ${infoId} 0 R >>\n` +
      `startxref\n${xrefAt}\n%%EOF\n`,
  );

  const file = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    file.set(chunk, at);
    at += chunk.length;
  }

  return file;
}

/*
The same, as a file to hand to the browser.

Split from the bytes so a test can read what was written: jsdom's `Blob` has
no way to get them back out, and the thing worth asserting about a pdf is
every byte offset in its cross-reference table.
*/
export async function buildImagePdf(
  pages: PdfImagePage[],
  meta: PdfMeta,
): Promise<Blob> {
  return new Blob([await encodeImagePdf(pages, meta)], { type: PDF_MIME });
}
