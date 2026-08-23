import { NextResponse } from "next/server";

/*
Liveness probe for the container healthcheck and the post-deploy verification
in .github/workflows/release.yaml.

Deliberately does not touch the Rust backend. This answers "is the Next server
up and routing?", and nothing else: a probe that also pinged the backend would
report the frontend as unhealthy whenever the backend was down, and Docker
would restart a perfectly healthy frontend for someone else's outage. Caddy
already serves the backend on its own path, so the two fail independently.
*/

// Without this the route is prerendered at build time and every later request
// is answered from that snapshot — a health probe that cannot fail is not one.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
