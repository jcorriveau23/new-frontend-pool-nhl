"use client";
import React from "react";
import { Link } from "@/navigation";
import { useSearchParams } from "next/navigation";

interface Props {
  name: string | undefined;
  id: number | undefined;
  textStyle: string | null;
}

export default function PlayerLink(props: Props) {
  const searchParams = useSearchParams();
  return props.name && props.id ? (
    <Link href={`/player/${props.id}?${searchParams}`}>
      <p className={`${props.textStyle ?? ""} text-link hover:underline`}>
        {props.name}
      </p>
    </Link>
  ) : null;
}
