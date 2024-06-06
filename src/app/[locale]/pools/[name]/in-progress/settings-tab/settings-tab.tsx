import * as React from "react";
import PoolSettingsComponent from "@/components/pool-settings";
import { usePoolContext } from "@/context/pool-context";

export default function SettingsTab() {
  const { poolInfo } = usePoolContext();

  return (
    <div>
      <PoolSettingsComponent
        poolName={poolInfo.name}
        poolStatus={poolInfo.status}
        oldPoolSettings={poolInfo.settings}
      />
    </div>
  );
}
