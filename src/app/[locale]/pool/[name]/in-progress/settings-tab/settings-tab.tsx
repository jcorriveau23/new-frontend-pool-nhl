import * as React from "react";
import PoolSettingsComponent from "@/components/pool-settings";
import { hasPoolPrivilege, usePoolContext } from "@/context/pool-context";
import { useUser } from "@/context/useUserData";
import { PoolState } from "@/data/pool/model";

export default function SettingsTab() {
  const { poolInfo, updatePoolInfo } = usePoolContext();
  const userData = useUser();

  // A pool marked as final is an archive, nothing is left to tune on it.
  const canEdit =
    poolInfo.status !== PoolState.Final &&
    hasPoolPrivilege(userData.info?.id, poolInfo);

  return (
    <div className="pt-4">
      <PoolSettingsComponent
        poolName={poolInfo.name}
        poolStatus={poolInfo.status}
        oldPoolSettings={poolInfo.settings}
        poolOwner={poolInfo.owner}
        participants={poolInfo.participants}
        canEdit={canEdit}
        onUpdated={updatePoolInfo}
      />
    </div>
  );
}
