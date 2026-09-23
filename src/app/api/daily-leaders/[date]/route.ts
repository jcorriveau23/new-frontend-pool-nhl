import { NextResponse } from "next/server";

import { getServerSideDailyLeaders } from "@/lib/server-data/daily-leaders";

// The daily scorers of one day, which the pool's daily tab reads.
export async function GET(
  request: Request,
  props: { params: Promise<{ date: string }> },
) {
  const { date } = await props.params;

  const dailyLeaders = await getServerSideDailyLeaders(date);

  if (dailyLeaders === null) {
    return NextResponse.json(
      { error: `No daily leaders found with date ${date}.` },
      { status: 404 },
    );
  }

  return NextResponse.json(dailyLeaders);
}
