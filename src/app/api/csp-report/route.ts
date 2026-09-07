import { NextRequest, NextResponse } from "next/server";

/*
Sink for the `report-uri` in the Content-Security-Policy set by `proxy.ts`.

The policy ships in report-only mode, which is only useful if the reports go
somewhere that can be watched. Without this they would land in each individual
visitor's devtools console, where nobody would ever see them. Logging here puts
them in the container log next to everything else.

Read the reports before flipping CSP_ENFORCE=true: a directive that is too
narrow shows up here first as a blocked-uri, instead of later as a blank page.
*/

// Reports are POSTed by the browser on a real request, so this must never be
// answered from a build-time snapshot.
export const dynamic = "force-dynamic";

interface CspReport {
  "document-uri"?: string;
  "violated-directive"?: string;
  "effective-directive"?: string;
  "blocked-uri"?: string;
  "source-file"?: string;
  "line-number"?: number;
}

export async function POST(request: NextRequest) {
  let report: CspReport | undefined;

  try {
    // Browsers send `application/csp-report` with a { "csp-report": {...} }
    // envelope. The body is attacker-influencable, so nothing here trusts its
    // shape beyond reading a few strings back out.
    const body = await request.json();
    report = body?.["csp-report"] ?? body;
  } catch {
    // A malformed body is not worth a log line of its own — extensions and
    // scanners post junk here.
    return new NextResponse(null, { status: 204 });
  }

  if (report) {
    console.warn(
      `CSP violation: ${report["effective-directive"] ?? report["violated-directive"] ?? "unknown directive"}` +
        ` blocked ${report["blocked-uri"] ?? "unknown"}` +
        ` on ${report["document-uri"] ?? "unknown page"}` +
        (report["source-file"]
          ? ` (${report["source-file"]}:${report["line-number"] ?? 0})`
          : "")
    );
  }

  // 204: the browser discards the response either way, and returning no body
  // keeps this cheap under the volume a noisy extension can generate.
  return new NextResponse(null, { status: 204 });
}
