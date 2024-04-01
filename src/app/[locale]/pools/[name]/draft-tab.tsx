import * as React from "react";
import { Pool } from "@/data/pool/model";

interface Props {
  poolInfo: Pool;
}

export default function DraftTab(props: Props) {
  React.useEffect(() => {}, []);

  return <h1>Draft</h1>;
}
