import { describe, expect, it } from "vitest";

import {
  androidAppLinkIntentUrl,
  detectInAppBrowser,
  detectMobilePlatform,
} from "@/lib/in-app-browser";

// Real user agents, kept verbatim. Hand-trimmed ones stop catching the thing
// these patterns exist for: the token order and punctuation Meta actually ships.
const MESSENGER_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/450.0.0.45.109;FBBV/571249431;FBDV/iPhone14,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]";
const MESSENGER_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/450.0.0.35.109;]";
const FACEBOOK_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone14,2;FBMD/iPhone;FBSV/17.5;FBID/phone;FBLC/en_US]";
const FACEBOOK_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/465.0.0.39.70;]";
const INSTAGRAM_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 Instagram 334.0.0.42.95 Android";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const CHROME_DESKTOP =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

describe("detectInAppBrowser", () => {
  it("names each Meta webview", () => {
    expect(detectInAppBrowser(MESSENGER_IOS)).toBe("messenger");
    expect(detectInAppBrowser(MESSENGER_ANDROID)).toBe("messenger");
    expect(detectInAppBrowser(FACEBOOK_IOS)).toBe("facebook");
    expect(detectInAppBrowser(FACEBOOK_ANDROID)).toBe("facebook");
    expect(detectInAppBrowser(INSTAGRAM_ANDROID)).toBe("instagram");
  });

  /*
  The ordering guard. Messenger's iOS webview carries `FBAN` just like the
  Facebook app's, so a Facebook pattern tested first would claim it and the
  banner would name the wrong app.
  */
  it("does not let the Facebook family swallow Messenger", () => {
    expect(MESSENGER_IOS).toContain("FBAN");
    expect(detectInAppBrowser(MESSENGER_IOS)).toBe("messenger");
  });

  it("falls back to the family for an unknown Meta app", () => {
    expect(
      detectInAppBrowser(
        "Mozilla/5.0 (iPhone) [FBAN/SomethingNew;FBAV/1.0.0;]",
      ),
    ).toBe("facebook");
  });

  it("catches the non-Meta webviews with the same problem", () => {
    expect(detectInAppBrowser("Mozilla/5.0 (iPhone) Line/14.1.0")).toBe(
      "other",
    );
    expect(
      detectInAppBrowser("Mozilla/5.0 (Linux; Android 14) LinkedInApp"),
    ).toBe("other");
  });

  it("is null in a real browser", () => {
    expect(detectInAppBrowser(CHROME_ANDROID)).toBeNull();
    expect(detectInAppBrowser(SAFARI_IOS)).toBeNull();
    expect(detectInAppBrowser(CHROME_DESKTOP)).toBeNull();
    expect(detectInAppBrowser("")).toBeNull();
  });
});

describe("detectMobilePlatform", () => {
  it("reads the platform", () => {
    expect(detectMobilePlatform(MESSENGER_ANDROID)).toBe("android");
    expect(detectMobilePlatform(MESSENGER_IOS)).toBe("ios");
    expect(detectMobilePlatform(CHROME_DESKTOP)).toBe("other");
  });

  it("covers the other iOS devices", () => {
    expect(detectMobilePlatform("Mozilla/5.0 (iPad; CPU OS 17_5)")).toBe("ios");
    expect(
      detectMobilePlatform("Mozilla/5.0 (iPod touch; CPU iPhone OS 17_5)"),
    ).toBe("ios");
  });
});

describe("androidAppLinkIntentUrl", () => {
  it("builds an intent that Android resolves itself", () => {
    const intent = androidAppLinkIntentUrl(
      "https://slapshot.xyz/en/pool/my-pool",
    );

    expect(intent).toBe(
      "intent://slapshot.xyz/en/pool/my-pool#Intent;scheme=https;" +
        "action=android.intent.action.VIEW;" +
        "category=android.intent.category.BROWSABLE;" +
        "S.browser_fallback_url=https%3A%2F%2Fslapshot.xyz%2Fen%2Fpool%2Fmy-pool;end",
    );
  });

  /*
  Pinning a browser package would force the browser and skip the installed
  WebAPK, which is the only reason this URL exists rather than a plain link.
  */
  it("names no package, so the installed app can claim the link", () => {
    expect(androidAppLinkIntentUrl("https://slapshot.xyz/")).not.toContain(
      "package=",
    );
  });

  it("keeps the query string", () => {
    expect(
      androidAppLinkIntentUrl(
        "https://slapshot.xyz/en/pool/my-pool?date=2026-10-21",
      ),
    ).toContain("intent://slapshot.xyz/en/pool/my-pool?date=2026-10-21#Intent");
  });

  /*
  The fragment of an intent URL *is* the intent, so a fragment on the link
  cannot ride along in the target. It has to survive in the fallback URL
  instead, or a link to an anchor would lose it on the way out.
  */
  it("drops a fragment from the target but keeps it in the fallback", () => {
    const intent = androidAppLinkIntentUrl(
      "https://slapshot.xyz/pool/p#roster",
    );

    expect(intent).toContain("intent://slapshot.xyz/pool/p#Intent;");
    expect(intent).toContain(
      `S.browser_fallback_url=${encodeURIComponent("https://slapshot.xyz/pool/p#roster")}`,
    );
  });

  it("escapes the fallback URL so its separators are not read as extras", () => {
    const intent = androidAppLinkIntentUrl("https://slapshot.xyz/p?a=1&b=2");

    expect(intent).toContain("S.browser_fallback_url=https%3A%2F%2F");
    // An unescaped `&` or `;` here would terminate the extra and corrupt the intent.
    expect(intent?.split("S.browser_fallback_url=")[1]).toBe(
      `${encodeURIComponent("https://slapshot.xyz/p?a=1&b=2")};end`,
    );
  });

  it("refuses anything that is not an http(s) URL", () => {
    expect(androidAppLinkIntentUrl("fb-messenger://share")).toBeNull();
    expect(androidAppLinkIntentUrl("javascript:alert(1)")).toBeNull();
    expect(androidAppLinkIntentUrl("not a url")).toBeNull();
    expect(androidAppLinkIntentUrl("")).toBeNull();
  });

  it("carries http through as http", () => {
    expect(androidAppLinkIntentUrl("http://localhost:3000/pool/p")).toContain(
      "#Intent;scheme=http;",
    );
  });
});
