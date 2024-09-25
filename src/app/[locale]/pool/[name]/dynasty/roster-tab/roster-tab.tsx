import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePoolContext } from "@/context/pool-context";
import { getPoolerAllPlayers, Player, PoolUser } from "@/data/pool/model";
import { toast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/context/useSessionData";
import PoolerRoster from "@/components/pooler-roster";

export default function RosterTab() {
  const {
    poolInfo,
    selectedParticipant,
    updateSelectedParticipant,
    updatePoolInfo,
  } = usePoolContext();
  const userSession = useSession();

  const [protectedPlayerIds, setProtectedPlayerIds] = React.useState<
    number[] | null
  >(null);

  const t = useTranslations();

  React.useEffect(() => {
    const selectedUser = poolInfo.participants.find(
      (user) => user.name == selectedParticipant
    );

    // If the user has already a list of protected players, set it as default.
    setProtectedPlayerIds(
      selectedUser
        ? poolInfo.context?.protected_players?.[selectedUser.id] ?? null
        : null
    );
  }, [selectedParticipant]);

  const onPlayerSelection = (user: PoolUser, player: Player) => {
    // Need to have an account to protect the players.
    if (
      userSession.info?.userID !== user.id &&
      userSession.info?.userID !== poolInfo.owner
    ) {
      toast({
        variant: "destructive",
        title: t("CannotUpdateProtectedPlayers", { userName: user.name }),
        duration: 5000,
      });
      return;
    }

    // Update the list of protected players.
    setProtectedPlayerIds((prevPlayers) => {
      if (prevPlayers === null) {
        return [player.id];
      }
      // Check if the player is already in the list
      if (prevPlayers.includes(player.id)) {
        // Remove the player from the list
        return prevPlayers.filter((id) => id !== player.id);
      } else {
        // Cannot protect to much players.
        if (
          prevPlayers &&
          prevPlayers.length >=
            (poolInfo.settings.dynasty_settings
              ?.next_season_number_players_protected ?? 0)
        ) {
          toast({
            variant: "destructive",
            title: t("TooMuchProtectedPlayers", {
              limit:
                poolInfo.settings.dynasty_settings
                  ?.next_season_number_players_protected,
            }),
            duration: 5000,
          });
          return prevPlayers;
        }
        // Add the player to the list
        return [...prevPlayers, player.id];
      }
    });
  };

  const onSaveProtectedPlayers = async (user: PoolUser) => {
    // Need to have an account to protect the players.
    if (
      userSession.info?.userID !== user.id &&
      userSession.info?.userID !== poolInfo.owner
    ) {
      toast({
        variant: "destructive",
        title: t("CannotUpdateProtectedPlayers", { userName: user.name }),
        duration: 2000,
      });
      return;
    }

    const res = await fetch("/api-rust/protect-players", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession.info?.jwt}`,
      },
      body: JSON.stringify({
        pool_name: poolInfo.name,
        protected_players_user_id: user.id,
        protected_players: protectedPlayerIds ?? [],
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      toast({
        variant: "destructive",
        title: t("CouldNotProtectPlayers", {
          name: poolInfo.name,
          error: error,
        }),
        duration: 5000,
      });
      return;
    }

    const data = await res.json();
    updatePoolInfo(data);
    toast({
      title: t("SuccessProtectingPlayers"),
      duration: 2000,
    });
  };

  const onCompleteProtection = async () => {
    // Need to have an account to protect the players.
    const res = await fetch("/api-rust/complete-protection", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession.info?.jwt}`,
      },
      body: JSON.stringify({
        pool_name: poolInfo.name,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      toast({
        variant: "destructive",
        title: t("CouldNotCompleteProtection", {
          name: poolInfo.name,
          error: error,
        }),
        duration: 5000,
      });
      return;
    }

    const data = await res.json();
    updatePoolInfo(data);
    toast({
      title: t("SuccessCompleteProtection"),
      duration: 2000,
    });
  };

  return (
    <>
      <Tabs
        defaultValue={selectedParticipant}
        value={selectedParticipant}
        onValueChange={(userName) => updateSelectedParticipant(userName)}
      >
        <div className="overflow-auto">
          <TabsList>
            {poolInfo.participants?.map((user: PoolUser) => (
              <TabsTrigger key={user.id} value={user.name}>
                <div className="flex justify-between items-center">
                  <div className="text-left">{user.name}</div>
                  <div className="text-right">
                    {poolInfo.context?.protected_players?.[user.id]?.length ??
                    0 > 0 ? (
                      <Shield className="h-4 w-4 text-green-500 ml-2" />
                    ) : null}
                  </div>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {poolInfo.participants?.map((user) => (
          <TabsContent key={user.id} value={user.name}>
            <PoolerRoster
              userRoster={getPoolerAllPlayers(poolInfo.context!, user)}
              protectedPlayerIds={protectedPlayerIds}
              teamSalaryCap={poolInfo.settings.salary_cap}
              onPlayerSelection={(user, player) =>
                onPlayerSelection(user, player)
              }
              considerOnlyProtected={true}
            />
            <div className="flex justify-end">
              <Button
                disabled={
                  !userSession.info?.jwt ||
                  protectedPlayerIds?.length !==
                    poolInfo.settings.dynasty_settings
                      ?.next_season_number_players_protected ||
                  protectedPlayerIds?.every((item) =>
                    poolInfo.context?.protected_players?.[user.id]?.includes(
                      item
                    )
                  )
                }
                onClick={() => onSaveProtectedPlayers(user)}
              >
                {t("Save")}
              </Button>
            </div>
          </TabsContent>
        ))}
        {userSession.info?.userID === poolInfo.owner ? (
          <Button onClick={() => onCompleteProtection()}>
            {t("StartDraft")}
          </Button>
        ) : null}
      </Tabs>
    </>
  );
}
