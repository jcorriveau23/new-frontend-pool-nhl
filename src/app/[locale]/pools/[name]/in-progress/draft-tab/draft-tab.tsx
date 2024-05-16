import * as React from "react";
import { Pool } from "@/data/pool/model";
import Draft from "@/components/draft";

interface Props {
  poolInfo: Pool;
}

export default function DraftTab(props: Props) {
  return <Draft poolInfo={props.poolInfo} />;
}
