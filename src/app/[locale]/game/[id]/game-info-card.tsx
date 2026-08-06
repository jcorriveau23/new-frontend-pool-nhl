"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, Clock, MapPin, Ticket, Tv } from "lucide-react";

import { Broadcast, Venue } from "@/data/nhl/gameLanding";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  startTimeUTC: string;
  venue?: Venue;
  venueLocation?: Venue;
  broadcasts?: Broadcast[];
  ticketsLink?: string;
}

export default function GameInfoCard(props: Props) {
  const t = useTranslations();
  const date = new Date(Date.parse(props.startTimeUTC));

  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const venueName = props.venue?.default;
  const location = props.venueLocation?.default;

  // De-duplicate broadcast networks (the API lists them per market).
  const networks = Array.from(
    new Set((props.broadcasts ?? []).map((b) => b.network).filter(Boolean))
  );

  const InfoItem = ({
    icon,
    children,
  }: {
    icon: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <span className="text-primary shrink-0">{icon}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <InfoItem icon={<CalendarDays className="size-4" />}>
          {formattedDate}
        </InfoItem>
        <InfoItem icon={<Clock className="size-4" />}>{formattedTime}</InfoItem>
        {venueName ? (
          <InfoItem icon={<MapPin className="size-4" />}>
            {venueName}
            {location ? (
              <span className="text-muted-foreground"> · {location}</span>
            ) : null}
          </InfoItem>
        ) : null}
        {networks.length > 0 ? (
          <InfoItem icon={<Tv className="size-4" />}>
            <span className="flex flex-wrap gap-1">
              {networks.map((network) => (
                <Badge key={network} variant="secondary">
                  {network}
                </Badge>
              ))}
            </span>
          </InfoItem>
        ) : null}
        {props.ticketsLink ? (
          <InfoItem icon={<Ticket className="size-4" />}>
            <a
              href={props.ticketsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t("Tickets")}
            </a>
          </InfoItem>
        ) : null}
      </CardContent>
    </Card>
  );
}
