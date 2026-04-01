"use client";

import { getCurrentReservationDateString } from "@api/helpers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc } from "@/utils/orpc";

export function ParkingReservationCard() {
  const today = getCurrentReservationDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedCarId, setSelectedCarId] = useState("");
  const accountQuery = useQuery(orpc.getMyAccount.queryOptions());
  const queryClient = useQueryClient();
  const cars = accountQuery.data?.cars ?? [];
  const resolvedSelectedCarId = cars.some((car) => car.id === selectedCarId) ? selectedCarId : (cars[0]?.id ?? "");
  const selectedCar = cars.find((car) => car.id === resolvedSelectedCarId) ?? null;

  const reservationMutation = useMutation(
    orpc.reserveParkingSpot.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.getMyReservations.queryOptions().queryKey,
        });
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
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
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

          <div className="space-y-2">
            <Label htmlFor="reservation-car">Voiture</Label>
            <select
              id="reservation-car"
              className="border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-2 text-sm"
              disabled={accountQuery.isLoading || cars.length === 0}
              value={resolvedSelectedCarId}
              onChange={(event) => setSelectedCarId(event.target.value)}
            >
              {cars.length ? null : <option value="">Aucune voiture disponible</option>}
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name} {car.electric ? "(electrique / hybride rechargeable)" : "(classique)"}
                </option>
              ))}
            </select>
          </div>

          <Button
            disabled={
              !selectedDate || !resolvedSelectedCarId || reservationMutation.isPending || accountQuery.isLoading
            }
            onClick={() =>
              reservationMutation.mutate({
                carId: resolvedSelectedCarId,
                date: selectedDate,
              })
            }
          >
            {reservationMutation.isPending ? "Reservation..." : "Reserver"}
          </Button>
        </div>

        {selectedCar ? (
          <p className="text-muted-foreground text-sm">
            {selectedCar.electric
              ? "Cette voiture est consideree comme electrique / hybride rechargeable: une place avec borne est priorisee, puis une place classique en fallback."
              : "Cette voiture est consideree comme classique: seule une place non electrique sera reservee."}
          </p>
        ) : null}

        {accountQuery.data && cars.length === 0 ? (
          <p className="text-sm text-destructive">Ajoute d'abord une voiture dans Mon compte pour pouvoir reserver.</p>
        ) : null}

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
