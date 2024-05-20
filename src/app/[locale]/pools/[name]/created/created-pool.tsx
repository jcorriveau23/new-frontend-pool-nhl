import * as React from "react";
import { Pool } from "@/data/pool/model";

interface Props {
  poolInfo: Pool;
}

export default function CreatedPool(props: Props) {
  return (
    <div className="items-center text-center">
      TODO: Created Pool Status displaying pool settings and the list of pooler.
      Poolers can join the room and user info will be displayed here. The owner
      of the pool is allowed to update pool settings and kick people out of the
      room.
    </div>
  );
}
