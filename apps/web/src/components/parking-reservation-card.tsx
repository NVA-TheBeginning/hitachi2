"use client";

import { getCurrentReservationDateString } from "@api/helpers";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc } from "@/utils/orpc";

export function ParkingReservationCard() {
  const today = getCurrentReservationDateString();
  const [selectedDate, setSelectedDate] = useState(today);

  const reservationMutation = useMutation(
    orpc.reserveParkingSpot.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Place ${data.parkingSpot.name} reservee.`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  return (
    <section className="rounded-lg border p-4">
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-medium">Reservation de parking</h2>
          <p className="text-xs text-muted-foreground">
            La reservation utilise la premiere voiture enregistree sur votre compte.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="reservation-date">Date</Label>
            <Input
              id="reservation-date"
              type="date"
              min={today}
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>

          <Button
            disabled={!selectedDate || reservationMutation.isPending}
            onClick={() =>
              reservationMutation.mutate({
                date: selectedDate,
              })
            }
          >
            {reservationMutation.isPending ? "Reservation..." : "Reserver"}
          </Button>
        </div>

        {reservationMutation.data ? (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm">
            <p>
              Place reservee: <strong>{reservationMutation.data.parkingSpot.name}</strong>
            </p>
            <p>Date: {reservationMutation.data.date}</p>
            <p>Borne de recharge: {reservationMutation.data.parkingSpot.charger ? "Oui" : "Non"}</p>
            <p>Places restantes: {reservationMutation.data.remainingSpots}</p>
          </div>
        ) : null}

        {reservationMutation.isError ? (
          <p className="text-sm text-destructive">{reservationMutation.error.message}</p>
        ) : null}
      </div>
    </section>
  );
}
