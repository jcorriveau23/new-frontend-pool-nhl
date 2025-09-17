import * as React from "react";
import { getTranslations } from "next-intl/server";
import PageTitle from "@/components/page-title";
import PlayersTable from "@/components/player-table";

export default async function Players() {
  const t = await getTranslations();

  return (
    <div className="items-center text-center">
      <PageTitle title={t("PlayerPageTitle")} />

      <PlayersTable
        sortField={"points"}
        skip={null}
        limit={null}
        considerOnlyProtected={false}
        pushUrl="/players"
        playersOwner={null}
        protectedPlayers={null}
        onPlayerSelect={null}
      />
    </div>
  );
}
