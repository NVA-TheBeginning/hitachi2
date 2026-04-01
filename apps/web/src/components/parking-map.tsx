"use client";

import { getCurrentReservationDateString } from "@api/helpers";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, ArrowRightIcon, ZapIcon } from "lucide-react";
import { useState } from "react";
import Loader from "@/components/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc } from "@/utils/orpc";

type ParkingSpot = {
  id: string;
  name: string;
  charger: boolean;
};

const ROW_ORDER = ["A", "B", "C", "D", "E", "F"] as const;
const ROWS_WITH_ALLEY_AFTER = new Set(["A", "C", "E"]);
const ALLEY_DIRECTION_BY_ROW: Partial<Record<(typeof ROW_ORDER)[number], "left-to-right" | "right-to-left">> = {
  A: "left-to-right",
  C: "right-to-left",
  E: "left-to-right",
};

function formatReservationDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function normalizeDate(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}

function getSpotRow(name: string) {
  return name.match(/^[A-Z]+/i)?.[0] ?? "?";
}

function getSpotClasses(status: "available" | "reserved" | "mine") {
  switch (status) {
    case "mine":
      return "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "available":
      return "border-sky-500 bg-sky-500/5 text-sky-700 dark:text-sky-300";
    default:
      return "border-black bg-zinc-950/[0.03] text-zinc-950 dark:border-white dark:bg-white/5 dark:text-white";
  }
}

function ParkingSpotTile({ spot, status }: { spot: ParkingSpot; status: "available" | "reserved" | "mine" }) {
  return (
    <div
      className={`relative flex aspect-[4/5] min-h-12 items-center justify-center rounded-lg border-2 px-1.5 py-2 shadow-sm ${getSpotClasses(status)}`}
    >
      {spot.charger ? <ZapIcon className="absolute top-1 left-1/2 size-3.5 -translate-x-1/2" /> : null}
      <span className="text-xs font-semibold tracking-wide">{spot.name}</span>
    </div>
  );
}

function AlleyDirection({ direction }: { direction: "left-to-right" | "right-to-left" }) {
  if (direction === "right-to-left") {
    return (
      <div className="flex w-full items-center justify-between text-muted-foreground">
        <ArrowLeftIcon className="size-5" />
        <ArrowLeftIcon className="size-5" />
        <ArrowLeftIcon className="size-5" />
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between text-muted-foreground">
      <ArrowRightIcon className="size-5" />
      <ArrowRightIcon className="size-5" />
      <ArrowRightIcon className="size-5" />
    </div>
  );
}

function getSpotStatus(spotId: string, availableSpotIds: Set<string>, myReservedSpotIds: Set<string>) {
  if (myReservedSpotIds.has(spotId)) {
    return "mine";
  }

  if (availableSpotIds.has(spotId)) {
    return "available";
  }

  return "reserved";
}

export function ParkingMap() {
  const today = getCurrentReservationDateString();
  const [selectedDate, setSelectedDate] = useState(today);

  const allSpotsQuery = useQuery(orpc.getAllParkingSpots.queryOptions());
  const availableSpotsQuery = useQuery(orpc.getAvailableParkingSpots.queryOptions({ date: selectedDate }));
  const myReservationsQuery = useQuery(orpc.getMyReservations.queryOptions());

  if (allSpotsQuery.isLoading || availableSpotsQuery.isLoading || myReservationsQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Parking</CardTitle>
          <CardDescription>Chargement du plan du parking.</CardDescription>
        </CardHeader>
        <CardContent>
          <Loader />
        </CardContent>
      </Card>
    );
  }

  if (allSpotsQuery.isError || availableSpotsQuery.isError || myReservationsQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Parking indisponible</CardTitle>
          <CardDescription>Impossible de charger le plan du parking pour le moment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-destructive">
          {allSpotsQuery.isError ? <p>{allSpotsQuery.error.message}</p> : null}
          {availableSpotsQuery.isError ? <p>{availableSpotsQuery.error.message}</p> : null}
          {myReservationsQuery.isError ? <p>{myReservationsQuery.error.message}</p> : null}
        </CardContent>
      </Card>
    );
  }

  const allSpots = allSpotsQuery.data ?? [];
  const availableSpotIds = new Set((availableSpotsQuery.data?.parkingSpots ?? []).map((spot) => spot.id));
  const myReservedSpotIds = new Set(
    (myReservationsQuery.data ?? [])
      .filter((reservation) => normalizeDate(reservation.date) === selectedDate)
      .map((reservation) => reservation.parkingSpot.id),
  );

  const groupedSpots = allSpots.reduce<Record<string, ParkingSpot[]>>((rows, spot) => {
    const row = getSpotRow(spot.name);
    if (!rows[row]) {
      rows[row] = [];
    }

    rows[row].push(spot);
    return rows;
  }, {});

  const orderedRows = ROW_ORDER.map((row) => [row, groupedSpots[row] ?? []] as const).filter(
    ([, spots]) => spots.length > 0,
  );
  const reservedCount = allSpots.length - availableSpotIds.size;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Parking</CardTitle>
          <CardDescription>
            Visualise les places libres, reservees et ta reservation pour une date donnee.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="parking-date">Date</Label>
            <Input
              id="parking-date"
              type="date"
              min={today}
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-sky-500 bg-sky-500/5 p-3 text-sm">
              <p className="font-medium text-sky-700 dark:text-sky-300">Places libres</p>
              <p className="text-muted-foreground mt-1">{availableSpotIds.size} place(s)</p>
            </div>
            <div className="rounded-xl border border-black bg-zinc-950/[0.03] p-3 text-sm dark:border-white dark:bg-white/5">
              <p className="font-medium">Places reservees</p>
              <p className="text-muted-foreground mt-1">{reservedCount} place(s)</p>
            </div>
            <div className="rounded-xl border border-emerald-500 bg-emerald-500/10 p-3 text-sm">
              <p className="font-medium text-emerald-700 dark:text-emerald-300">Ta reservation</p>
              <p className="text-muted-foreground mt-1">
                {myReservedSpotIds.size > 0 ? `${myReservedSpotIds.size} place(s)` : "Aucune reservation"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-sky-500 bg-sky-500/5" />
              <span>Libre</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-black bg-zinc-950/[0.03] dark:border-white dark:bg-white/5" />
              <span>Deja reservee</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-emerald-500 bg-emerald-500/10" />
              <span>Reservee par toi</span>
            </div>
            <div className="flex items-center gap-2">
              <ZapIcon className="size-4" />
              <span>Place electrique</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan du parking</CardTitle>
          <CardDescription>{formatReservationDate(selectedDate)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[720px] rounded-3xl border bg-muted/20 p-3 md:p-4">
              <div className="mb-4 flex justify-start">
                <div className="rounded-full border bg-background px-3 py-1.5 text-[10px] font-medium tracking-[0.3em] uppercase">
                  Entree
                </div>
              </div>

              <div className="space-y-2.5">
                {orderedRows.map(([row, spots]) => {
                  return (
                    <div key={row} className="space-y-2.5">
                      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 md:gap-4">
                        <div className="w-5 text-xs font-semibold text-muted-foreground">{row}</div>
                        <div className="grid grid-cols-10 gap-1.5">
                          {spots.map((spot) => (
                            <ParkingSpotTile
                              key={spot.id}
                              spot={spot}
                              status={getSpotStatus(spot.id, availableSpotIds, myReservedSpotIds)}
                            />
                          ))}
                        </div>
                      </div>

                      {ROWS_WITH_ALLEY_AFTER.has(row) ? (
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 md:gap-4">
                          <div className="w-5" />
                          <div className="flex h-10 items-center rounded-xl border border-dashed bg-background/70 px-3">
                            <AlleyDirection direction={ALLEY_DIRECTION_BY_ROW[row] ?? "left-to-right"} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex justify-end">
                <div className="rounded-full border bg-background px-3 py-1.5 text-[10px] font-medium tracking-[0.3em] uppercase">
                  Sortie
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
