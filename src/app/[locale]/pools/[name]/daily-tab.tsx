import * as React from "react";
import { Pool } from "@/data/pool/model";

interface Props {
  poolInfo: Pool;
  dictUsers: Record<string, string>;
}

export default function DailyTab(props: Props) {
  React.useEffect(() => {}, []);

  return <h1>Daily tab</h1>;
}
