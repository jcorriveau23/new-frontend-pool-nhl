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
                      <Popover>
                        <PopoverTrigger asChild>
                          <LucideAlertOctagon color="red" className="p-0 m-0" />
                        </PopoverTrigger>
                        <PopoverContent align="start">
                          {t("pickTraded", {
                            newOwner: roundPicksOwner[from],
                            round: index + 1,
                            oldOwner: from,
                          })}
                        </PopoverContent>
                      </Popover>
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
