import React from "react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Pool, PoolUser } from "@/data/pool/model";
import { useTranslations } from "next-intl";
import InformationIcon from "./information-box";
import { usePoolContext } from "@/context/pool-context";

interface Props {
  poolUser: PoolUser;
  poolInfo: Pool;
}

export default function PickList(props: Props) {
  const t = useTranslations();

  const { dictUsers } = usePoolContext();

  return (
    <Table>
      <TableCaption>{`${t("ListePickOwnedBy")} ${
        props.poolUser.name
      }`}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>{t("Round")}</TableHead>
          <TableHead>{t("From")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.poolInfo.context?.tradable_picks?.map((roundPicksOwner, index) =>
          Object.keys(roundPicksOwner)
            .filter((from) => roundPicksOwner[from] === props.poolUser.id)
            .map((from) => (
              <TableRow key={`${from}-${index}`}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span>{dictUsers[from].name}</span>
                    {from === roundPicksOwner[from] ? null : (
                      <InformationIcon
                        text={t("pickTraded", {
                          newOwner: dictUsers[roundPicksOwner[from]]?.name,
                          round: index + 1,
                          oldOwner: dictUsers[from]?.name,
                        })}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
        )}
      </TableBody>
    </Table>
  );
}
