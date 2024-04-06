import React from "react";

import {
  Table,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { usePoolContext } from "@/context/pool-context";
import { Pool } from "@/data/pool/model";
import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { LucideAlertOctagon } from "lucide-react";

interface Props {
  participant: string;
  poolInfo: Pool;
}

export default function PickList(props: Props) {
  const { dictUsers } = usePoolContext();
  const t = useTranslations();

  return (
    <Table>
      <TableCaption>{`${t("Liste of picks owned by")} ${
        dictUsers[props.participant]
      }`}</TableCaption>
      <TableHeader>
        <TableHead>{t("Round")}</TableHead>
        <TableHead>{t("From")}</TableHead>
      </TableHeader>
      {props.poolInfo.context?.tradable_picks?.map((roundPicksOwner, index) =>
        Object.keys(roundPicksOwner)
          .filter((from) => roundPicksOwner[from] === props.participant)
          .map((from) => (
            <TableRow key={`${from}-${index}`}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <div>{dictUsers[from]}</div>
                <div>
                  {from === roundPicksOwner[from] ? null : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <LucideAlertOctagon color="red" className="p-0 m-0" />
                      </PopoverTrigger>
                      <PopoverContent align="start">
                        {t("pickTraded", {
                          newOwner: dictUsers[roundPicksOwner[from]],
                          round: index + 1,
                          oldOwner: dictUsers[from],
                        })}
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
      )}
    </Table>
  );
}
