import * as React from "react";
import PlayersTable from "@/components/player-table";
import { usePoolContext } from "@/context/pool-context";

export default function NhlPlayerTab() {
  const { protectedPlayers, poolInfo } = usePoolContext();
  return (
    <div>
      <PlayersTable
        sortField={"points"}
        skip={null}
        limit={null}
        considerOnlyProtected={true}
        pushUrl={`/pool/${poolInfo.name}`}
        playersOwner={null}
        protectedPlayers={protectedPlayers}
        onPlayerSelect={null}
      />
    </div>
  );
}
