import { NextResponse } from "next/server";

import { getServerSidePlayers } from "@/lib/server-data/players";

/*
The players list the tables page through.

The browser reads it here rather than through a server action so the request is
a plain cacheable GET, and so the backend url and its query shape stay on the
server.
*/
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const positions = params.getAll("positions");
  const descending = params.get("descending");
  const skip = params.get("skip");
  const limit = params.get("limit");

  const players = await getServerSidePlayers(
    positions.length > 0 ? positions : null,
    params.get("sort"),
    descending === null ? null : descending === "true",
    skip === null ? null : Number(skip),
    limit === null ? null : Number(limit),
  );

  if (players === null) {
    return NextResponse.json(
      { error: "The players could not be read." },
      { status: 502 },
    );
  }

  return NextResponse.json(players);
}
