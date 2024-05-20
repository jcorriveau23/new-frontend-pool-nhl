import * as React from "react";
import { Pool } from "@/data/pool/model";
import { useTranslations } from "next-intl";
import PoolSettingsComponent from "@/components/pool-settings";

interface Props {
  poolInfo: Pool;
}

export default function SettingsTab(props: Props) {
  const t = useTranslations();
  React.useEffect(() => {}, []);

  return (
    <div>
      <PoolSettingsComponent
        poolName={props.poolInfo.name}
        poolStatus={props.poolInfo.status}
        oldPoolSettings={props.poolInfo.settings}
      />
    </div>
  );
}
