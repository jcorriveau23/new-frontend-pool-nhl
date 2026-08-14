import * as React from "react";
import PoolSettingsComponent from "@/components/pool-settings";
import { hasPoolPrivilege, usePoolContext } from "@/context/pool-context";
import { useUser } from "@/context/useUserData";

export default function SettingsTab() {
  const { poolInfo, updatePoolInfo } = usePoolContext();
  const userData = useUser();

  return (
    <div className="pt-4">
      <PoolSettingsComponent
        poolName={poolInfo.name}
        poolStatus={poolInfo.status}
        oldPoolSettings={poolInfo.settings}
        poolOwner={poolInfo.owner}
        participants={poolInfo.participants}
        canEdit={hasPoolPrivilege(userData.info?.id, poolInfo)}
        onUpdated={updatePoolInfo}
      />
    </div>
  );
}
