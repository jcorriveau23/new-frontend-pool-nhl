"use client";

import * as React from "react";
import Image from "next/image";
import team_info from "@/lib/teams";

interface Props {
  teamId: number | undefined;
  width: number;
  height: number;
}

export function TeamLogo(props: Props) {
  return (
    <Image
      width={props.width}
      height={props.height}
      alt="team"
      src={team_info[props.teamId ?? 0].logo}
    />
  );
}
