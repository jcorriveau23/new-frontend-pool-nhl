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
import { Pool } from "@/data/pool/model";
import { useTranslations } from "next-intl";
import InformationIcon from "./information-box";

interface Props {
  participant: string;
  poolInfo: Pool;
}

export default function PickList(props: Props) {
  const t = useTranslations();

  return (
    <Table>
      <TableCaption>{`${t("Liste of picks owned by")} ${
        props.participant
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
            .filter((from) => roundPicksOwner[from] === props.participant)
            .map((from) => (
              <TableRow key={`${from}-${index}`}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <div>{from}</div>
                  <div>
                    {from === roundPicksOwner[from] ? null : (
                      <InformationIcon
                        text={t("pickTraded", {
                          newOwner: roundPicksOwner[from],
                          round: index + 1,
                          oldOwner: from,
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
