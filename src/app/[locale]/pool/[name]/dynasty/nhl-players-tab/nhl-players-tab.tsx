import * as React from "react";
import PlayersTable from "@/components/player-table";

export default function NhlPlayerTab() {
  return (
    <div>
      <PlayersTable sortField={"points"} skip={null} limit={null} />
    </div>
  );
}
