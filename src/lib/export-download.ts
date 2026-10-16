/*
Handing a generated file to the browser.

The only part of the export that touches the DOM, kept apart from
`export-document` so the serializers stay pure and the plumbing below — object
URLs that have to be created and revoked around a click — is written once
instead of in every menu item.

Everything here is generated and downloaded client side. That is not an
implementation detail: a pool is readable by the people in it and nobody else,
and routing an export through a server would mean sending the whole document
back to one that already sent it, with a URL somebody could share by accident.
*/

/*
Saves text as a file.

The anchor has to be in the document for Firefox to honour the click, and the
object URL has to outlive the click for Safari to read it — hence the detour
through the DOM and the deferred revoke, rather than the two-liner this looks
like it should be.
*/
export function downloadTextFile(
  filename: string,
  mimeType: string,
  content: string,
): void {
  downloadBlob(filename, new Blob([content], { type: mimeType }));
}

// The same, for what is already a blob — a png off a canvas.
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // A revoke on the next tick: the download is started by the click but the
  // blob is read after it returns, and revoking in between cancels it.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
