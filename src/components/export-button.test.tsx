import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ExportButton from "./export-button";
import { ExportDocument, ExportTable } from "@/lib/export-document";
import type { PdfImagePage } from "@/lib/pdf-document";
import { TableImageError } from "@/lib/table-image";
import type { ImageSection, SheetImageOptions } from "@/lib/table-image";

const downloadTextFile = vi.fn();
const downloadBlob = vi.fn();

vi.mock("@/lib/export-download", () => ({
  downloadTextFile: (...args: unknown[]) => downloadTextFile(...args),
  downloadBlob: (...args: unknown[]) => downloadBlob(...args),
}));

/*
Drawing and binding belong to `table-image` and `pdf-document`, which have
their own tests. Here only the wiring matters: which tables were asked for,
under what headings, and how a refusal reads.

The image module is spread rather than replaced, so `TableImageError` stays
the real one — the component tells it apart from an ordinary bug with
`instanceof`, and a stubbed class would make this test agree with itself
instead of with the app.
*/
const renderTableImage =
  vi.fn<(table: ExportTable, options: SheetImageOptions) => Promise<Blob>>();
const renderSheetPages =
  vi.fn<
    (
      sections: ImageSection[],
      options: SheetImageOptions,
    ) => Promise<PdfImagePage[]>
  >();
const buildImagePdf = vi.fn<() => Promise<Blob>>();

vi.mock("@/lib/table-image", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/table-image")>();

  return {
    ...actual,
    renderTableImage: (table: ExportTable, options: SheetImageOptions) =>
      renderTableImage(table, options),
    renderSheetPages: (sections: ImageSection[], options: SheetImageOptions) =>
      renderSheetPages(sections, options),
  };
});

vi.mock("@/lib/pdf-document", () => ({
  buildImagePdf: () => buildImagePdf(),
}));

const success = vi.fn();
const error = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => success(...args),
    error: (...args: unknown[]) => error(...args),
  },
}));

const doc: ExportDocument = {
  title: "Les Boys — pool report",
  meta: [{ label: "Season", value: "2026-27" }],
  sections: [
    {
      key: "section-standings",
      title: "Standings",
      tables: [
        {
          key: "standings",
          title: "Total ranking",
          columns: ["Rank", "Pooler"],
          rows: [[1, "Alice"]],
          note: "Standing as of 2027-01-12",
        },
      ],
    },
    {
      key: "section-trades",
      title: "Trades",
      tables: [
        {
          key: "trades",
          title: "Trades",
          columns: ["Date", "Gave"],
          rows: [["2027-01-08", "Suzuki"]],
        },
      ],
    },
  ],
  generatedAt: "2026-10-14T13:05:00.000Z",
};

const openMenu = async (build: () => ExportDocument = vi.fn(() => doc)) => {
  /*
  Pointer checks off. Base UI keeps `pointer-events: none` on the parent
  menu's positioner while a submenu is open and lifts it from a measured
  transition — which jsdom, having no layout engine, never finishes.
  */
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(<ExportButton build={build} baseName="Les Boys" />);

  await user.click(screen.getByRole("button", { name: /ExportPool/ }));
  await screen.findByText("ExportPdf");

  return { user, build };
};

beforeEach(() => {
  downloadTextFile.mockReset();
  downloadBlob.mockReset();
  renderTableImage.mockReset();
  renderTableImage.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  renderSheetPages.mockReset();
  renderSheetPages.mockResolvedValue([]);
  buildImagePdf.mockReset();
  buildImagePdf.mockResolvedValue(
    new Blob(["pdf"], { type: "application/pdf" }),
  );
  success.mockReset();
  error.mockReset();
});

describe("ExportButton", () => {
  /*
  The whole reason the document is passed as a function: building one walks a
  season of daily scores, and a page that renders this button must not pay
  for an export nobody asked for.
  */
  it("does not build the document until a format is picked", async () => {
    const build = vi.fn(() => doc);
    const { user } = await openMenu(build);

    expect(build).not.toHaveBeenCalled();

    await user.click(screen.getByText("ExportCsv"));
    expect(build).toHaveBeenCalledOnce();
  });

  it("offers the three files and the table pictures", async () => {
    await openMenu();

    for (const label of [
      "ExportPdf",
      "ExportCsv",
      "ExportHtml",
      "ExportImage",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("downloads a csv named after the pool and the day", async () => {
    const { user } = await openMenu();

    await user.click(screen.getByText("ExportCsv"));

    const [filename, mime, content] = downloadTextFile.mock.calls[0];
    expect(filename).toBe("les-boys-2026-10-14.csv");
    expect(mime).toContain("text/csv");
    expect(content).toContain("Rank,Pooler");
    expect(success).toHaveBeenCalledWith(
      'ExportDownloaded:{"filename":"les-boys-2026-10-14.csv"}',
    );
  });

  it("downloads the report as a page", async () => {
    const { user } = await openMenu();

    await user.click(screen.getByText("ExportHtml"));

    const [filename, mime, content] = downloadTextFile.mock.calls[0];
    expect(filename).toBe("les-boys-2026-10-14.html");
    expect(mime).toContain("text/html");
    expect(content).toContain("<!doctype html>");
  });

  describe("the pdf", () => {
    /*
    Pages of pixels and not one enormous image: the sheet is cut into pages,
    so a pool nobody could fit in a single bitmap is simply more pages.
    */
    it("draws every table, binds the pages and saves one file", async () => {
      const { user } = await openMenu();

      await user.click(screen.getByText("ExportPdf"));

      await waitFor(() => expect(downloadBlob).toHaveBeenCalledOnce());
      expect(renderTableImage).not.toHaveBeenCalled();
      expect(buildImagePdf).toHaveBeenCalledOnce();

      const [filename, blob] = downloadBlob.mock.calls[0];
      expect(filename).toBe("les-boys-2026-10-14.pdf");
      expect((blob as Blob).type).toBe("application/pdf");
    });

    it("hands the sheet every table, each under its own heading", async () => {
      const { user } = await openMenu();

      await user.click(screen.getByText("ExportPdf"));

      await waitFor(() => expect(renderSheetPages).toHaveBeenCalledOnce());
      expect(renderSheetPages.mock.calls[0][0]).toEqual([
        {
          table: doc.sections[0].tables[0],
          heading: "Standings — Total ranking",
          note: "Standing as of 2027-01-12",
        },
        {
          table: doc.sections[1].tables[0],
          heading: "Trades",
          note: undefined,
        },
      ]);
    });

    // The document is the whole pool, so its header carries what places it.
    it("heads the document with the pool and its own summary", async () => {
      const { user } = await openMenu();

      await user.click(screen.getByText("ExportPdf"));

      await waitFor(() => expect(renderSheetPages).toHaveBeenCalledOnce());
      expect(renderSheetPages.mock.calls[0][1]).toEqual({
        title: "Les Boys",
        subtitle: "Season: 2026-27",
        footer: "slapshot.xyz · 2026-10-14",
      });
    });
  });

  describe("saving one table as a picture", () => {
    const openImages = async (build?: () => ExportDocument) => {
      const opened = await openMenu(build);

      await opened.user.click(screen.getByText("ExportImage"));
      // The submenu names the tables, so opening it is what builds the
      // document — there is no list before that.
      await screen.findByText("Standings — Total ranking");

      return opened;
    };

    /*
    `fireEvent` rather than `user.click` for the rows of the submenu.

    A full pointer sequence moves the cursor off the submenu's trigger on its
    way to the row, and Base UI reads that as leaving the submenu — in a real
    browser the two are adjacent and the path never leaves them, which is
    geometry jsdom does not have. The click itself is what is under test.
    */
    const pick = (label: string) => fireEvent.click(screen.getByText(label));

    it("lists every table of the document under its own heading", async () => {
      await openImages();

      expect(screen.getByText("Standings — Total ranking")).toBeInTheDocument();
      // A table that repeats its section's name is listed once, not twice.
      expect(screen.getByText("Trades")).toBeInTheDocument();
    });

    it("renders the table that was picked, not the first one", async () => {
      await openImages();

      pick("Trades");

      await waitFor(() => expect(renderTableImage).toHaveBeenCalledOnce());
      expect(renderTableImage.mock.calls[0][0]).toMatchObject({
        key: "trades",
      });
    });

    /*
    An image posted in a chat has to say which pool it came from, so the
    pool's name is the heading and the table's own name goes under it.
    */
    it("heads the image with the pool, and the table under it", async () => {
      await openImages();

      pick("Standings — Total ranking");

      await waitFor(() => expect(renderTableImage).toHaveBeenCalledOnce());
      expect(renderTableImage.mock.calls[0][1]).toEqual({
        title: "Les Boys",
        subtitle: "Standings — Total ranking · Standing as of 2027-01-12",
        footer: "slapshot.xyz · 2026-10-14",
      });
    });

    it("downloads the png under a name that says which table it is", async () => {
      await openImages();

      pick("Trades");

      await waitFor(() => expect(downloadBlob).toHaveBeenCalledOnce());
      expect(downloadBlob.mock.calls[0][0]).toBe(
        "les-boys-trades-2026-10-14.png",
      );
    });

    it("builds the document once for the whole menu session", async () => {
      const build = vi.fn(() => doc);
      await openImages(build);

      pick("Trades");
      await waitFor(() => expect(downloadBlob).toHaveBeenCalledOnce());

      expect(build).toHaveBeenCalledOnce();
    });

    it("reports a document it could not build, and lists nothing", async () => {
      const build = vi.fn(() => {
        throw new Error("no roster for alice");
      });
      const { user } = await openMenu(build);

      await user.click(screen.getByText("ExportImage"));

      await waitFor(() =>
        expect(error).toHaveBeenCalledWith(
          'ExportFailed:{"error":"no roster for alice"}',
          { duration: 5000 },
        ),
      );
      expect(await screen.findByText("ExportNoTable")).toBeInTheDocument();
    });
  });

  describe("when something will not export", () => {
    /*
    A table the browser would not draw is something the organiser can act on,
    so it is worded for them rather than shown as the internal cause.
    */
    it("explains a picture it could not draw", async () => {
      renderSheetPages.mockRejectedValue(new TableImageError("bitmap too big"));
      const { user } = await openMenu();

      await user.click(screen.getByText("ExportPdf"));

      await waitFor(() =>
        expect(error).toHaveBeenCalledWith("ExportImageFailed", {
          duration: 6000,
        }),
      );
      expect(downloadBlob).not.toHaveBeenCalled();
    });

    it("names an ordinary bug instead of doing nothing on the click", async () => {
      const build = vi.fn(() => {
        throw new Error("no roster for alice");
      });
      const { user } = await openMenu(build);

      await user.click(screen.getByText("ExportCsv"));

      await waitFor(() =>
        expect(error).toHaveBeenCalledWith(
          'ExportFailed:{"error":"no roster for alice"}',
          { duration: 5000 },
        ),
      );
      expect(downloadTextFile).not.toHaveBeenCalled();
    });

    it("reports a failure that was not thrown as an Error", async () => {
      const build = vi.fn(() => {
        throw "flat tyre";
      });
      const { user } = await openMenu(build as unknown as () => ExportDocument);

      await user.click(screen.getByText("ExportCsv"));

      await waitFor(() =>
        expect(error).toHaveBeenCalledWith(
          'ExportFailed:{"error":"flat tyre"}',
          { duration: 5000 },
        ),
      );
    });
  });
});
