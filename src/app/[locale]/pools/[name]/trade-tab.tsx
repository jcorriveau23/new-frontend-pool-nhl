import * as React from "react";
import { Pool } from "@/data/pool/model";

interface Props {
  poolInfo: Pool;
  dictUsers: Record<string, string>;
}

export default function TradeTab(props: Props) {
  React.useEffect(() => {}, []);

  return <h1>Trade</h1>;
}
