"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CameraIcon, Loader2, Trash2Icon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { useIsMobile } from "@/hooks/use-is-mobile";
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

type ReservationItem = {
  id: string;
  date: string | Date;
  car: {
    name: string;
    licensePlate: string | null;
  };
  parkingSpot: {
    id: string;
    name: string;
    charger: boolean;
  };
};

function MobileCheckInCamera({
  reservation,
  onClose,
}: {
  reservation: ReservationItem;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<"starting" | "ready" | "error">("starting");
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("error");
        setCameraError("La camera n'est pas disponible sur cet appareil.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraState("ready");
      } catch (error) {
        setCameraState("error");
        setCameraError(error instanceof Error ? error.message : "Impossible d'ouvrir la camera.");
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-4 text-white">
      <div className="mx-auto flex h-full w-full max-w-md flex-col rounded-3xl bg-zinc-950">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
          <div className="space-y-1">
            <p className="text-lg font-semibold">Check-in</p>
            <p className="text-sm text-zinc-300">
              Reservation {reservation.parkingSpot.name} · {formatReservationDate(reservation.date)}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <XIcon className="size-4" />
            Fermer
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />

            {cameraState === "starting" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/65">
                <Loader2 className="size-6 animate-spin" />
                <p className="text-sm text-zinc-200">Ouverture de la camera...</p>
              </div>
            ) : null}

            {cameraState === "error" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
                <p className="text-sm font-medium text-red-300">Camera indisponible</p>
                <p className="text-sm text-zinc-300">{cameraError}</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium">Lecture du QR code</p>
            <p className="mt-1 text-sm text-zinc-300">
              La camera est prete. Le scan et la validation du QR seront branches dans l'etape suivante.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MyReservationsCard() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const reservationsQuery = useQuery(orpc.getMyReservations.queryOptions());
  const reservations = reservationsQuery.data ?? [];
  const [activeCheckInReservationId, setActiveCheckInReservationId] = useState<string | null>(null);

  const deleteReservationMutation = useMutation(
    orpc.deleteMyReservation.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.getMyReservations.queryOptions().queryKey,
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.getMyAccount.queryOptions().queryKey,
          }),
        ]);
        toast.success("Reservation supprimee.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const activeReservation = reservations.find((reservation) => reservation.id === activeCheckInReservationId) ?? null;

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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Mes reservations</CardTitle>
          <CardDescription>Consulte et supprime tes reservations actives.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reservations.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune reservation active pour le moment.</p>
          ) : (
            reservations.map((reservation) => (
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

                <div className="flex flex-col gap-2 sm:flex-row">
                  {isMobile ? (
                    <Button type="button" onClick={() => setActiveCheckInReservationId(reservation.id)}>
                      <CameraIcon className="size-4" />
                      Check-in
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteReservationMutation.isPending}
                    onClick={() => deleteReservationMutation.mutate({ reservationId: reservation.id })}
                  >
                    {deleteReservationMutation.isPending &&
                    deleteReservationMutation.variables?.reservationId === reservation.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2Icon className="size-4" />
                        Supprimer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {isMobile && activeReservation ? (
        <MobileCheckInCamera reservation={activeReservation} onClose={() => setActiveCheckInReservationId(null)} />
      ) : null}
    </>
  );
}
