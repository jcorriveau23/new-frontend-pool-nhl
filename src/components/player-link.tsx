import React from "react";
import { Link } from "@/navigation";

interface Props {
  name: string | undefined;
  id: number | undefined;
  textStyle: string | null;
}

export default function PlayerLink(props: Props) {
  return props.name && props.id ? (
    <Link href={`/player/${props.id}`}>
      <p className={`${props.textStyle ?? ""} text-link hover:underline`}>
        {props.name}
      </p>
    </Link>
  ) : null;
}
