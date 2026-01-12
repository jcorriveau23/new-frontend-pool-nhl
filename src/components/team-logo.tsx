"use client";

import * as React from "react";
import Image from "next/image";
import team_info from "@/lib/teams";

interface Props {
  teamId: number | null;
  width: number;
  height: number;
}

export function TeamLogo(props: Props) {
  return props.teamId && team_info[props.teamId] ? (
    <Image
      width={props.width}
      height={props.height}
      alt="team"
      src={team_info[props.teamId].logo}
    />
  ) : null;
}
