"use server";

import { NextResponse } from "next/server";

import { getServerSideGameLanding } from "@/actions/game-landing";

export async function GET(
  request: Request, 
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { id } = params;

  const landing = await getServerSideGameLanding(id as string);

  if (landing) {
    return NextResponse.json(landing);
  } else {
    return NextResponse.json(
      { error: `No game landing found with game ${id}.` },
      { status: 404 }
    );
  }
}
