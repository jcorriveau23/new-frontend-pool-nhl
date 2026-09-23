import { NextResponse } from "next/server";

import { searchPlayersByName } from "@/lib/server-data/players";

// Players matching a (partial) name. The backend matches on the name only; the
// caller sorts and filters the result set.
export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name");

  if (name === null || name.trim().length === 0) {
    return NextResponse.json(
      { error: "A name to search for is required." },
      { status: 400 },
    );
  }

  const players = await searchPlayersByName(name);

  if (players === null) {
    return NextResponse.json(
      { error: `No player could be searched for ${name}.` },
      { status: 502 },
    );
  }

  return NextResponse.json(players);
}
