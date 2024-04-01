import * as React from "react";
import { Pool } from "@/data/pool/model";

interface Props {
  poolInfo: Pool;
}

export default function HistoryTab(props: Props) {
  React.useEffect(() => {}, []);

  return <h1>History</h1>;
}
