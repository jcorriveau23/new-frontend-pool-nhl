"use server";

import { NextResponse } from "next/server";

// pages/api/games/[date].ts
import { getServerSideDailyGames } from "@/actions/daily-games";

export async function GET(
  request: Request, 
  props: { params: Promise<{ date: string }> }
) {
  const params = await props.params;
  const { date } = params;

  const score = await getServerSideDailyGames(date as string);

  if (score) {
    return NextResponse.json(score);
  } else {
    return NextResponse.json(
      { error: `No score found with date ${date}.` },
      { status: 404 }
    );
  }
}
