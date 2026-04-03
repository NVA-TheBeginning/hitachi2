"use client";

import { getCurrentReservationDateString } from "@api/helpers";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";

function OccupancyCard() {
  const [date, setDate] = useState(getCurrentReservationDateString());
  const { isPending, isError, data, error } = useQuery(orpc.getParkingLotUtilization.queryOptions({ date }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Taux d&apos;occupation</CardTitle>
        <CardDescription>Occupation des places de parking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full sm:w-fit" />
        </div>

        {isPending && <div className="flex h-20 items-center justify-center text-muted-foreground">Chargement...</div>}

        {isError && (
          <div className="flex h-20 items-center justify-center text-destructive">Erreur: {error.message}</div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
                <span className="text-muted-foreground">
                  {data.occupiedSlots} / {data.totalSlots} places
                </span>
                <span className="font-medium">{data.occupancyRate.toFixed(1)}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${data.occupancyRate}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
                <span className="text-muted-foreground">Bornes électriques</span>
                <span className="font-medium">
                  {data.occupiedElectricSlots} / {data.totalElectricSlots}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
                <span className="text-muted-foreground">Taux occupation</span>
                <span className="font-medium">{data.electricOccupancyRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NoShowCard() {
  const [date, setDate] = useState(getCurrentReservationDateString());
  const { isPending, isError, data, error } = useQuery(
    orpc.getNoShowRate.queryOptions({ startDate: date, endDate: date }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Taux de absentéisme</CardTitle>
        <CardDescription>Réservations non honorées</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full sm:w-fit" />
        </div>

        {isPending && <div className="flex h-20 items-center justify-center text-muted-foreground">Chargement...</div>}

        {isError && (
          <div className="flex h-20 items-center justify-center text-destructive">Erreur: {error.message}</div>
        )}

        {data && (
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-4xl font-bold">{data.rate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Taux d&apos;absentéisme</div>
            </div>

            <div className="grid gap-3 border-t pt-2 text-sm sm:grid-cols-3 sm:gap-0">
              <div className="text-center">
                <div className="font-medium">{data.completedCount}</div>
                <div className="text-muted-foreground">Honoré(s)</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{data.noShowCount}</div>
                <div className="text-muted-foreground">Absent(s)</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{data.totalReservations}</div>
                <div className="text-muted-foreground">Total</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StatisticsCards() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <OccupancyCard />
      <NoShowCard />
    </div>
  );
}
