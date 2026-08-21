"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import { Player, Position } from "@/data/pool/model";
import { salaryFormat, seasonFormat } from "@/app/utils/formating";
import { getExpirationSchedule } from "@/lib/lineup-analytics";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";

import { POSITION_COLORS } from "./utils";

interface ContractExpirationChartProps {
  // Every player owned by the pooler, lineup and reservists alike: a contract
  // comes off the books whether the player was starting or not.
  players: Player[];
}

const MILLION = 1_000_000;

// Past that many names the tooltip turns into a wall of text, the rest is
// summed up on a last line.
const MAX_LISTED_PLAYERS = 8;

interface ExpiringPlayer {
  id: number;
  name: string;
  salary: number;
  position: Position;
}

interface SeasonRow {
  season: string;
  forwards: number;
  defense: number;
  goalies: number;
  total: number;
  expiringPlayers: ExpiringPlayer[];
}

const ExpirationTooltip = ({
  active,
  payload,
}: TooltipProps<ValueType, NameType>) => {
  const t = useTranslations();

  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0].payload as SeasonRow;
  const listed = row.expiringPlayers.slice(0, MAX_LISTED_PLAYERS);
  const hiddenCount = row.expiringPlayers.length - listed.length;

  return (
    <div className="w-60 rounded-lg border border-border/50 bg-background px-2.5 py-2 text-xs shadow-xl">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{row.season}</span>
        <span className="font-semibold tabular-nums">
          {salaryFormat(row.total * MILLION)}
        </span>
      </div>
      <p className="mt-0.5 text-muted-foreground">
        {t("CapExpiringPlayers", { playerCount: row.expiringPlayers.length })}
      </p>
      <ul className="mt-2 space-y-1 border-t pt-2">
        {listed.map((player) => (
          <li key={player.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: POSITION_COLORS[player.position] }}
            />
            <span className="min-w-0 flex-1 truncate">{player.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {salaryFormat(player.salary)}
            </span>
          </li>
        ))}
        {hiddenCount > 0 ? (
          <li className="pt-0.5 text-muted-foreground">
            {t("AndMorePlayers", { playerCount: hiddenCount })}
          </li>
        ) : null}
      </ul>
    </div>
  );
};

// How much cap comes off the books, season by season. Stacked by position so a
// pooler sees at a glance whether it is his forwards or his defense that expire.
export function ContractExpirationChart({
  players,
}: ContractExpirationChartProps) {
  const t = useTranslations();

  const data = React.useMemo<SeasonRow[]>(() => {
    const playerById = new Map(players.map((player) => [player.id, player]));

    return getExpirationSchedule(players).map((bucket) => {
      // getExpirationSchedule already sorts each bucket by salary, so the
      // biggest contracts are the ones that survive the tooltip cut.
      const expiringPlayers = bucket.players.map((player) => ({
        ...player,
        position: playerById.get(player.id)?.position ?? Position.F,
      }));

      const salaryOf = (position: Position) =>
        expiringPlayers.reduce(
          (total, player) =>
            player.position === position ? total + player.salary / MILLION : total,
          0
        );

      return {
        season:
          bucket.season === null
            ? t("UnknownExpiration")
            : seasonFormat(bucket.season, 0),
        forwards: salaryOf(Position.F),
        defense: salaryOf(Position.D),
        goalies: salaryOf(Position.G),
        total: bucket.salary / MILLION,
        expiringPlayers,
      };
    });
  }, [players, t]);

  const chartConfig = React.useMemo<ChartConfig>(
    () => ({
      forwards: { label: t("Forwards"), color: POSITION_COLORS[Position.F] },
      defense: { label: t("Defense"), color: POSITION_COLORS[Position.D] },
      goalies: { label: t("Goalies"), color: POSITION_COLORS[Position.G] },
    }),
    [t]
  );

  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        {t("NoContractToCompare")}
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
      <BarChart
        accessibilityLayer
        data={data}
        margin={{ left: 4, right: 12, top: 8 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis dataKey="season" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickMargin={4}
          tickFormatter={(value: number) => `$${value.toFixed(0)}M`}
        />
        <ChartTooltip cursor={false} content={<ExpirationTooltip />} />
        {(["forwards", "defense", "goalies"] as const).map((group, index) => (
          <Bar
            key={group}
            dataKey={group}
            stackId="salary"
            fill={chartConfig[group].color as string}
            // A 2px surface stroke keeps the stacked segments from bleeding
            // into each other.
            stroke="var(--card)"
            strokeWidth={2}
            radius={index === 2 ? [4, 4, 0, 0] : 0}
            isAnimationActive={false}
          />
        ))}
        <ChartLegend verticalAlign="bottom" content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}
