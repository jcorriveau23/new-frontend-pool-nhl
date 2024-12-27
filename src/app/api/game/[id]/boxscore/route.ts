"use server";

import { NextResponse } from "next/server";

import { getServerSideBoxScore } from "@/actions/game-boxscore";

export async function GET(
  request: Request, 
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;

  const boxscore = await getServerSideBoxScore(id as string);

  if (boxscore) {
    return NextResponse.json(boxscore);
  } else {
    return NextResponse.json(
      { error: `No game boxscore found with game ${id}.` },
      { status: 404 }
    );
  }
}
