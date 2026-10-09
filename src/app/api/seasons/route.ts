import { NextResponse } from "next/server";

import { getSeasons } from "@/lib/season-info";

/*
Every season the backend has stats on record for, oldest first.

The players table reads it from the browser to offer the season picker, the
same way it reads the players themselves: a plain cacheable GET, with the
backend url kept on the server.
*/
export async function GET() {
  return NextResponse.json(await getSeasons());
}
