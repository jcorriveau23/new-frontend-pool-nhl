// The pools page, list all the pools stored in the db.

"use client";
import * as React from "react";
import { Pool, PoolState } from "@/data/pool/model";
import { db } from "@/db";
import InProgressPool from "./in-progress-pool";
import { PoolContextProvider } from "@/context/pool-context";
import { UserData } from "@/data/user/model";
import { getServerSideUsers } from "@/app/actions/users";

export default function PoolPage({ params }: { params: { name: string } }) {
  const [poolInfo, setPoolInfo] = React.useState<Pool | null>(null);
  const [users, setUsers] = React.useState<UserData[] | null>(null);

  const findLastDateInDb = (pool: Pool | null) => {
    // This function looks if there is a date player's stats that have already be stored in the local database.
    // If so a day will be sent to retrieve the data.
    if (!pool || !pool.context || !pool.context.score_by_day) {
      return null;
    }

    const tempDate = new Date();

    // TODO: a cleaner logic would be to always look from the current date to the from date
    let i = 200; // Will look into the past 200 days to find the last date from now.

    do {
      const fTempDate = tempDate.toISOString().slice(0, 10);
      if (fTempDate in pool.context.score_by_day) {
        return fTempDate;
      }

      tempDate.setDate(tempDate.getDate() - 1);
      i -= 1;
    } while (i > 0);

    return null;
  };

  const getUsers = async (participants: string[] | null) => {
    const data = await getServerSideUsers(participants);
    setUsers(data);
  };

  React.useEffect(() => {
    const fetchPoolInfo = async () => {
      // @ts-ignore
      const poolDb = await db.pools.get({ name: params.name });
      const lastFormatDate = findLastDateInDb(poolDb);

      let res;

      // TODO: risk here since we used the start date of the pool stored locally in database.
      // It could be corrupt or changed. Should process that server side.
      res = await fetch(
        lastFormatDate
          ? `/api-rust/pool/${params.name}/${poolDb.season_start}/${lastFormatDate}`
          : `/api-rust/pool/${params.name}`
      );
      if (!res.ok) {
        return {};
      }
      let data = await res.json();

      if (poolDb) {
        // If we detect that the pool stored in the database date_updated field does not match the one
        // from the server, we will force a server update.
        if (data.date_updated !== poolDb.date_updated) {
          res = await fetch(`/api-rust/pool/${params.name}`);
          if (!res.ok) {
            return {};
          }
          data = await res.json();
        } else if (lastFormatDate) {
          // This is in the case we called the pool information for only a range of date since the rest of the date
          // were already stored and valid in the client database, we then only merge the needed data of the client database pool.

          data.context.score_by_day = {
            ...poolDb.context.score_by_day,
            ...data.context.score_by_day,
          };
          // TODO hash the results and compare with server hash to determine if an update is needed.
          // If we do that, we could remove the logic of comparing the field date_updated above that would be cleaner and more robust.
        }

        data.id = poolDb.id;
      }

      // Set the pool information in the state and update the pool stored in the database.
      setPoolInfo(data);
      // @ts-ignore
      db.pools.put(data, "name");

      // Fetch the users name so that we can display a user name instead of a user id.
      getUsers(data.participants);
    };

    fetchPoolInfo();
  }, [params.name]);

  const getPoolContent = (poolInfo: Pool) => {
    switch (poolInfo.status) {
      case PoolState.Created:
      // return (
      //   <CreatedPool
      //     user={user}
      //     hasOwnerRights={hasOwnerRights}
      //     poolInfo={poolInfo}
      //     setPoolInfo={setPoolInfo}
      //   />
      // );
      case PoolState.Draft:
      // return (
      //   <DraftPool
      //     user={user}
      //     poolInfo={poolInfo}
      //     setPoolInfo={setPoolInfo}
      //     injury={injury}
      //   />
      // );
      case PoolState.InProgress:
      case PoolState.Final:
        return (
          <InProgressPool
            // user={user}
            // hasOwnerRights={hasOwnerRights}
            poolInfo={poolInfo}
            // injury={injury}
            // setPoolUpdate={setPoolUpdate}
          />
        );
      case PoolState.Dynastie:
      // return (
      //   <DynastiePool
      //     user={user}
      //     poolInfo={poolInfo}
      //     setPoolUpdate={setPoolUpdate}
      //     injury={injury}
      //   />
      // );
    }
  };

  if (poolInfo === null || users === null) {
    return <h1>Loading...</h1>;
  }

  return (
    <PoolContextProvider poolInfo={poolInfo} users={users}>
      {getPoolContent(poolInfo)}
    </PoolContextProvider>
  );
}
