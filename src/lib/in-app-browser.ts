/*
Getting a shared link out of a social app's in-app browser.

A link tapped in Messenger, Facebook or Instagram does not open the user's
browser. It opens a webview the host app owns, which has its own cookie jar and
none of the capabilities an installed app relies on. Two of those matter here:

  - Passkeys. Hanko registers a WebAuthn credential, which Android WebView
    cannot create at all and which iOS only allows a webview whose host app
    declares the associated domain. So an invite link opened in Messenger does
    not merely look worse — a new pooler cannot finish signing up in it.
  - Install. `beforeinstallprompt` never fires there, and iOS Safari's "Add to
    Home Screen" is a Safari menu the webview does not have.

So the fix is not to detect the installed app — no API exposed inside those
webviews can answer that, `getInstalledRelatedApps()` included — but to hand
the URL back to the operating system and let *it* decide. On Android that
resolves to the installed app when there is one; see `androidAppLinkIntentUrl`.
On iOS nothing can be done programmatically, so all that is left is to say
which menu item leads out.

The functions here take the user agent as an argument rather than reading
`navigator`, which is what keeps them testable and server-safe. The caller
reads `navigator` after mount.
*/

/**
 * The host app a webview belongs to, when it is one worth naming in a message
 * to the user. `other` is the rest: detected as an in-app browser, but the
 * banner has to stay generic about which app it is.
 */
export type InAppBrowser =
  "messenger" | "facebook" | "instagram" | "threads" | "other";

/*
Meta's apps all tag their webview with the same family of tokens — `FBAN` on
iOS, `FB_IAB` on Android, `FBAV` for the app version — so the specific app has
to be read before falling back to the family. Messenger carries `FBAN` too,
which is why it is tested first: matching Facebook on `FBAN` alone would
swallow it.

User agent sniffing is the only signal these webviews give us. It is why
everything downstream of this is dismissible and additive: a token that
changes costs a banner shown to someone who did not need it, never a broken
page.
*/
const IN_APP_BROWSER_PATTERNS: ReadonlyArray<[InAppBrowser, RegExp]> = [
  ["messenger", /FBAN\/MessengerForiOS|FB_IAB\/MESSENGER|Messenger[/ ]/i],
  ["instagram", /\bInstagram\b/i],
  ["threads", /\bBarcelona\b|\bThreads\b/i],
  ["facebook", /FBAN\/FBIOS|FB_IAB\/FB4A|\bFBAN\b|\bFB_IAB\b|\bFBAV\b/i],
  // Not Meta, but the same trap, and the Android way out works the same.
  ["other", /\bLine\/|\bTwitter\b|LinkedInApp|BytedanceWebview|musical_ly/i],
];

/**
 * Which in-app browser this user agent belongs to, or null for a real browser.
 */
export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  for (const [app, pattern] of IN_APP_BROWSER_PATTERNS) {
    if (pattern.test(userAgent)) {
      return app;
    }
  }
  return null;
}

/** The platform behind a user agent, as far as escaping a webview depends on it. */
export type MobilePlatform = "android" | "ios" | "other";

export function detectMobilePlatform(userAgent: string): MobilePlatform {
  if (/android/i.test(userAgent)) {
    return "android";
  }
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "ios";
  }
  return "other";
}

/**
 * An `intent://` URL that asks Android to open `url` with whatever handles it.
 *
 * Installing the PWA from Chrome produces a WebAPK, and that WebAPK registers
 * verified intent filters for the manifest's scope. So this resolves to the
 * installed app when there is one and to the default browser otherwise, which
 * is the answer to "is it installed?" without ever having to ask.
 *
 * Deliberately no `package=` extra: pinning Chrome would force the browser and
 * skip the installed app, which is the whole point of going through Android.
 *
 * `browser_fallback_url` is the safety net. Whether a given host app forwards
 * this scheme at all is undocumented — a webview only honours `intent://` if
 * it chooses to — and with the fallback set, the worst case is that the link
 * behaves like the ordinary link it already was.
 *
 * Returns null for anything that is not an http(s) URL, since the fragment of
 * an `intent://` URL is the intent itself and there is nowhere to put another
 * scheme. A fragment on `url` is dropped for the same reason; it survives in
 * the fallback URL.
 */
export function androidAppLinkIntentUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  const target = `${parsed.host}${parsed.pathname}${parsed.search}`;
  const extras = [
    `scheme=${parsed.protocol.replace(":", "")}`,
    "action=android.intent.action.VIEW",
    "category=android.intent.category.BROWSABLE",
    `S.browser_fallback_url=${encodeURIComponent(parsed.href)}`,
    "end",
  ];

  return `intent://${target}#Intent;${extras.join(";")}`;
}
