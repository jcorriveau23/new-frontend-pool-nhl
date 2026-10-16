import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadTextFile } from "./export-download";

// What each blob was built from, keyed by the blob itself.
const blobContent = new WeakMap<Blob, string>();
const NativeBlob = globalThis.Blob;

class RecordingBlob extends NativeBlob {
  constructor(parts: BlobPart[] = [], options?: BlobPropertyBag) {
    super(parts, options);
    blobContent.set(this, parts.map(String).join(""));
  }
}

globalThis.Blob = RecordingBlob as unknown as typeof Blob;

/*
jsdom implements neither object URLs nor printing, which is most of what this
module does — so both are stubbed and the assertions are about the sequence the
browsers need rather than about a file appearing anywhere.

The blobs are read back through the constructor rather than off the object:
jsdom's `Blob` carries no `text()`, and the point of the assertion is what was
handed to it anyway.
*/
interface CapturedBlob {
  type: string;
  content: string;
}

const created: CapturedBlob[] = [];
const revoked: string[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  created.length = 0;
  revoked.length = 0;

  URL.createObjectURL = vi.fn((blob: Blob) => {
    created.push({ type: blob.type, content: blobContent.get(blob) ?? "" });
    return `blob:mock/${created.length}`;
  }) as unknown as typeof URL.createObjectURL;

  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  }) as unknown as typeof URL.revokeObjectURL;
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("downloadTextFile", () => {
  it("clicks an anchor that names the file, then takes it out of the page", () => {
    const clicks: string[] = [];
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        // Asserted from inside the click: Firefox only honours an anchor that
        // is in the document when it is clicked.
        clicks.push(this.download);
        expect(this.isConnected).toBe(true);
      });

    downloadTextFile("les-boys-2026-10-14.csv", "text/csv", "a,b\r\n");

    expect(clicks).toEqual(["les-boys-2026-10-14.csv"]);
    expect(document.querySelector("a")).toBeNull();
    click.mockRestore();
  });

  it("wraps the content in a blob of the type it was given", () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadTextFile("pool.json", "application/json;charset=utf-8", "{}\n");

    expect(created).toEqual([
      { type: "application/json;charset=utf-8", content: "{}\n" },
    ]);
  });

  it("revokes the url after the click rather than during it", () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadTextFile("pool.csv", "text/csv", "a");

    // Still alive while the download is being started — revoking here is what
    // cancels it in Safari.
    expect(revoked).toEqual([]);

    vi.runAllTimers();
    expect(revoked).toEqual(["blob:mock/1"]);
  });
});
