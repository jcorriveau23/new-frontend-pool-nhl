import { NextResponse } from "next/server";

import { getServerSideGoalClip } from "@/lib/server-data/goal-clip";

export async function GET(
  request: Request,
  props: { params: Promise<{ clipId: string }> },
) {
  const params = await props.params;
  const { clipId } = params;

  const clip = await getServerSideGoalClip(clipId as string);

  if (clip) {
    return NextResponse.json(clip);
  } else {
    return NextResponse.json(
      { error: `No playable clip found with id ${clipId}.` },
      { status: 404 },
    );
  }
}
