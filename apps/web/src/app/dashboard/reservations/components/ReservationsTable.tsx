"use client";

import { getCurrentReservationDateString } from "@api/helpers";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReservationStatus } from "@/lib/enum";
import { orpc, queryClient } from "@/utils/orpc";

function getStatusLabel(status: ReservationStatus) {
  switch (status) {
    case ReservationStatus.RESERVED:
      return "Reserve";
    case ReservationStatus.COMPLETED:
      return "Présence confirmée";
    case ReservationStatus.CANCELLED:
      return "Annule";
    case ReservationStatus.NO_SHOW:
      return "Absent";
  }
}

function getStatusColor(status: ReservationStatus) {
  switch (status) {
    case ReservationStatus.RESERVED:
      return "bg-blue-100 text-blue-800";
    case ReservationStatus.COMPLETED:
      return "bg-green-100 text-green-800";
    case ReservationStatus.CANCELLED:
      return "bg-gray-100 text-gray-800";
    case ReservationStatus.NO_SHOW:
      return "bg-red-100 text-red-800";
  }
}

function ReservationActions({ reservation }: { reservation: { id: string; status: ReservationStatus } }) {
  const updateMutation = useMutation(
    orpc.finalizeReservation.mutationOptions({
      onSuccess: async () => {
        toast.success("Statut mis a jour.");
        await queryClient.invalidateQueries({ queryKey: orpc.getAllReservations.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.deleteReservation.mutationOptions({
      onSuccess: async () => {
        toast.success("Reservation annulee.");
        await queryClient.invalidateQueries({ queryKey: orpc.getAllReservations.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  return (
    <div className="flex items-center gap-2">
      {reservation.status === ReservationStatus.RESERVED && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateMutation.mutate({ reservationId: reservation.id, status: ReservationStatus.COMPLETED })
            }
            disabled={updateMutation.isPending}
          >
            Complet
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateMutation.mutate({ reservationId: reservation.id, status: ReservationStatus.NO_SHOW })}
            disabled={updateMutation.isPending}
          >
            Absent
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm("Annuler cette reservation?")) {
                deleteMutation.mutate({ reservationId: reservation.id });
              }
            }}
            disabled={deleteMutation.isPending}
          >
            Annuler
          </Button>
        </>
      )}
    </div>
  );
}

export function ReservationsTable() {
  const [userFilter, setUserFilter] = useState("");
  const [startDate, setStartDate] = useState(getCurrentReservationDateString());
  const [endDate, setEndDate] = useState(getCurrentReservationDateString());
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "">("");

  const query = useQuery(
    orpc.getAllReservations.queryOptions({
      startDate,
      endDate,
      ...(statusFilter && { status: statusFilter }),
    }),
  );

  const allUsersQuery = useQuery(orpc.getAllUsers.queryOptions());

  const reservations = query.data ?? [];
  const users = allUsersQuery.data ?? [];

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const userEmailMap = new Map(users.map((u) => [u.id, u.email]));

  const filteredReservations = reservations.filter((res) => {
    if (!userFilter) return true;
    const userName = userMap.get(res.car.id) || "";
    const userEmail = userEmailMap.get(res.car.id) || "";
    return (
      userName.toLowerCase().includes(userFilter.toLowerCase()) ||
      userEmail.toLowerCase().includes(userFilter.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Rechercher par utilisateur..."
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="max-w-xs"
        />
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-fit" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-fit" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReservationStatus | "")}
          className="h-10 rounded-md border px-3 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value={ReservationStatus.RESERVED}>Reserve</option>
          <option value={ReservationStatus.COMPLETED}>Complet</option>
          <option value={ReservationStatus.CANCELLED}>Annule</option>
          <option value={ReservationStatus.NO_SHOW}>Absent</option>
        </select>
      </div>

      {query.isPending && <p className="text-muted-foreground">Chargement...</p>}
      {query.isError && <p className="text-destructive">Erreur: {query.error.message}</p>}

      {query.isSuccess && (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left text-sm font-medium">Date</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Place</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Voiture</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Statut</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Aucune reservation trouvee.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((reservation) => (
                  <tr key={reservation.id} className="border-b">
                    <td className="px-4 py-2">{new Date(reservation.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-2">{reservation.parkingSpot.name}</td>
                    <td className="px-4 py-2">
                      <div>{reservation.car.name}</div>
                      <div className="text-xs text-muted-foreground">{reservation.car.licensePlate || "N/A"}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(reservation.status)}`}
                      >
                        {getStatusLabel(reservation.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <ReservationActions reservation={reservation} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
