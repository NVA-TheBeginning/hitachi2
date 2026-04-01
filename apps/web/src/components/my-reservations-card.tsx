"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

function formatReservationDate(date: string | Date) {
  return new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function MyReservationsCard() {
  const queryClient = useQueryClient();
  const reservationsQuery = useQuery(orpc.getMyReservations.queryOptions());

  const deleteReservationMutation = useMutation(
    orpc.deleteMyReservation.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.getMyReservations.queryOptions().queryKey,
        });
        toast.success("Reservation supprimee.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  if (reservationsQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes reservations</CardTitle>
          <CardDescription>Consulte et supprime tes reservations actives.</CardDescription>
        </CardHeader>
        <CardContent>
          <Loader />
        </CardContent>
      </Card>
    );
  }

  if (reservationsQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes reservations</CardTitle>
          <CardDescription>Consulte et supprime tes reservations actives.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{reservationsQuery.error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mes reservations</CardTitle>
        <CardDescription>Consulte et supprime tes reservations actives.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {reservationsQuery.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune reservation active pour le moment.</p>
        ) : (
          reservationsQuery.data.map((reservation) => (
            <div
              key={reservation.id}
              className="flex flex-col gap-3 border p-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium">{formatReservationDate(reservation.date)}</p>
                <p className="text-sm">
                  Place: <strong>{reservation.parkingSpot.name}</strong>
                  {" · "}
                  Borne: {reservation.parkingSpot.charger ? "Oui" : "Non"}
                </p>
                <p className="text-muted-foreground text-sm">
                  Voiture: {reservation.car.name}
                  {reservation.car.licensePlate ? ` (${reservation.car.licensePlate})` : ""}
                </p>
              </div>

              <Button
                type="button"
                variant="destructive"
                disabled={deleteReservationMutation.isPending}
                onClick={() => deleteReservationMutation.mutate({ reservationId: reservation.id })}
              >
                {deleteReservationMutation.isPending && deleteReservationMutation.variables?.reservationId === reservation.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Trash2Icon className="size-4" />
                    Supprimer
                  </>
                )}
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
