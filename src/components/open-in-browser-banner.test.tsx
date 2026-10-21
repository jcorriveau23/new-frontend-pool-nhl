import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import OpenInBrowserBanner from "./open-in-browser-banner";

/*
The banner that gets a shared pool link out of a social app's webview.

What is worth pinning here is not the markup but the branch: Android gets a
real `intent://` handoff, iOS gets instructions because nothing else is
possible, and a real browser gets nothing at all. Getting that last one wrong
would show the banner to everyone.
*/

const MESSENGER_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/450.0.0.35.109;]";
const MESSENGER_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/450.0.0.45.109;FBDV/iPhone14,2]";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

const realUserAgent = window.navigator.userAgent;

function useUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });
}

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  useUserAgent(realUserAgent);
});

describe("inside a webview on Android", () => {
  beforeEach(() => {
    useUserAgent(MESSENGER_ANDROID);
  });

  /*
  The handoff itself. Android resolves this to the installed app when there is
  one, which is the only reason the banner can offer an app it cannot detect.
  */
  it("offers an intent for the current page", () => {
    render(<OpenInBrowserBanner />);

    const link = screen.getByRole("link", { name: /InAppBrowserOpen/ });
    expect(link).toHaveAttribute("href", expect.stringContaining("intent://"));
    expect(link.getAttribute("href")).toContain(
      "action=android.intent.action.VIEW",
    );
    expect(link.getAttribute("href")).toContain(
      `S.browser_fallback_url=${encodeURIComponent(window.location.href)}`,
    );
  });

  it("names the app it is rescuing the user from", () => {
    render(<OpenInBrowserBanner />);

    expect(screen.getByText("InAppBrowserAndroidTitle")).toBeInTheDocument();
    expect(
      screen.getByText('InAppBrowserDescription:{"app":"Messenger"}'),
    ).toBeInTheDocument();
  });

  it("stays dismissed for the rest of the session", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<OpenInBrowserBanner />);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(
      screen.queryByText("InAppBrowserAndroidTitle"),
    ).not.toBeInTheDocument();

    // A navigation remounts it, and it has to keep quiet across that.
    unmount();
    render(<OpenInBrowserBanner />);
    expect(
      screen.queryByText("InAppBrowserAndroidTitle"),
    ).not.toBeInTheDocument();
  });
});

describe("inside a webview on iOS", () => {
  beforeEach(() => {
    useUserAgent(MESSENGER_IOS);
  });

  /*
  No intent, and no link of any kind: a home screen PWA registers no universal
  links and a webview cannot hand off to Safari, so a button that claimed to
  would do nothing. The instructions are the whole feature here.
  */
  it("explains the way out instead of offering a link", async () => {
    const user = userEvent.setup();
    render(<OpenInBrowserBanner />);

    expect(screen.getByText("InAppBrowserIosTitle")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /InAppBrowserHow/ }));

    expect(screen.getByText("InAppBrowserIosStepMenu")).toBeInTheDocument();
    expect(screen.getByText("InAppBrowserIosStepOpen")).toBeInTheDocument();
  });
});

describe("outside a webview", () => {
  it("renders nothing in a real mobile browser", () => {
    useUserAgent(CHROME_ANDROID);
    const { container } = render(<OpenInBrowserBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  // A webview on a desktop has neither way out, so there is nothing to offer.
  it("renders nothing in a webview that is on neither platform", () => {
    useUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 [FBAN/FBDesktop]",
    );
    const { container } = render(<OpenInBrowserBanner />);

    expect(container).toBeEmptyDOMElement();
  });
});

/*
Site data blocked is a real configuration in these webviews, and an unguarded
`sessionStorage` read throws rather than returning null. The banner has to
survive it: this is the one browser it exists to rescue.
*/
describe("with storage blocked", () => {
  it("still shows, and still closes", async () => {
    useUserAgent(MESSENGER_ANDROID);
    const blocked = () => {
      throw new Error("The operation is insecure.");
    };
    const storage = { getItem: blocked, setItem: blocked };
    Object.defineProperty(window, "sessionStorage", {
      value: storage,
      configurable: true,
    });

    try {
      const user = userEvent.setup();
      render(<OpenInBrowserBanner />);
      expect(screen.getByText("InAppBrowserAndroidTitle")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(
        screen.queryByText("InAppBrowserAndroidTitle"),
      ).not.toBeInTheDocument();
    } finally {
      // @ts-expect-error restoring jsdom's own implementation
      delete window.sessionStorage;
    }
  });
});
