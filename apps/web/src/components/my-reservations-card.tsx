"use client";

import { formatDateLong } from "@api/helpers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CameraIcon, Loader2, Trash2Icon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { type client, orpc } from "@/utils/orpc";

type ReservationItem = NonNullable<Awaited<ReturnType<typeof client.getMyReservations>>>[number];

type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

function extractSpotIdFromQrCode(rawValue: string) {
  const normalized = rawValue.trim();
  if (!normalized) return null;

  const matchCheckInPath = (value: string) => {
    const match = value.match(/^\/checkin\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  try {
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      return matchCheckInPath(new URL(normalized).pathname);
    }

    if (normalized.startsWith("/")) {
      return matchCheckInPath(normalized);
    }
  } catch {
    return null;
  }

  return normalized.includes("/") ? null : normalized;
}

function MobileCheckInCamera({ reservation, onClose }: { reservation: ReservationItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimeoutRef = useRef<number | null>(null);
  const isSubmittingRef = useRef(false);
  const [cameraState, setCameraState] = useState<"starting" | "ready" | "error">("starting");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerMessage, setScannerMessage] = useState("Pointe la camera vers le QR code de ta place.");

  const stopCamera = useCallback(() => {
    if (scanTimeoutRef.current) {
      window.clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const checkInMutation = useMutation(
    orpc.checkInBySpot.mutationOptions({
      onSuccess: async () => {
        stopCamera();
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.getMyReservations.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.getMyAccount.key(),
          }),
        ]);
        toast.success("Check-in valide.");
      },
      onError: (error) => {
        isSubmittingRef.current = false;
        setScannerMessage(error.message);
      },
    }),
  );

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
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (cameraState !== "ready") return;

    if (!window.BarcodeDetector) {
      setScannerMessage("La lecture automatique du QR code n'est pas supportee sur ce navigateur.");
      return;
    }

    let cancelled = false;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

    const scan = async () => {
      if (cancelled || checkInMutation.isSuccess || isSubmittingRef.current) return;

      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        scanTimeoutRef.current = window.setTimeout(() => {
          void scan();
        }, 250);
        return;
      }

      try {
        const detectedCodes = await detector.detect(video);
        const rawValue = detectedCodes.find((code) => typeof code.rawValue === "string")?.rawValue;

        if (!rawValue) {
          scanTimeoutRef.current = window.setTimeout(() => {
            void scan();
          }, 300);
          return;
        }

        const scannedSpotId = extractSpotIdFromQrCode(rawValue);
        if (!scannedSpotId) {
          setScannerMessage("QR code non reconnu. Scanne un QR code de place genere par l'application.");
          scanTimeoutRef.current = window.setTimeout(() => {
            void scan();
          }, 900);
          return;
        }

        if (scannedSpotId !== reservation.parkingSpot.id) {
          setScannerMessage(`QR invalide. Scanne la place ${reservation.parkingSpot.name}.`);
          scanTimeoutRef.current = window.setTimeout(() => {
            void scan();
          }, 900);
          return;
        }

        isSubmittingRef.current = true;
        setScannerMessage(`QR detecte pour ${reservation.parkingSpot.name}. Validation en cours...`);
        checkInMutation.mutate({ spotId: scannedSpotId });
      } catch (error) {
        setScannerMessage(error instanceof Error ? error.message : "Impossible de lire le QR code.");
        scanTimeoutRef.current = window.setTimeout(() => {
          void scan();
        }, 900);
      }
    };

    void scan();

    return () => {
      cancelled = true;
      if (scanTimeoutRef.current) {
        window.clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    };
  }, [cameraState, checkInMutation, reservation.parkingSpot.id, reservation.parkingSpot.name]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-4 text-white">
      <div className="mx-auto flex h-full w-full max-w-md flex-col rounded-3xl bg-zinc-950">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
          <div className="space-y-1">
            <p className="text-lg font-semibold">Check-in</p>
            <p className="text-sm text-zinc-300">
              Reservation {reservation.parkingSpot.name} · {formatDateLong(reservation.date)}
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

            {checkInMutation.isPending ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/65">
                <Loader2 className="size-6 animate-spin" />
                <p className="text-sm text-zinc-200">Validation du check-in...</p>
              </div>
            ) : null}

            {checkInMutation.isSuccess ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-emerald-950/90 p-6 text-center">
                <p className="text-lg font-semibold text-emerald-200">Presence validee</p>
                <p className="text-sm text-emerald-100">
                  Check-in confirme pour {reservation.parkingSpot.name} a{" "}
                  {checkInMutation.data.checkedAt.toLocaleTimeString()}
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium">Lecture du QR code</p>
            <p className="mt-1 text-sm text-zinc-300">{scannerMessage}</p>
            {checkInMutation.isSuccess ? (
              <Button type="button" className="mt-4 w-full" onClick={onClose}>
                Fermer
              </Button>
            ) : null}
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
  const [activeCheckInReservation, setActiveCheckInReservation] = useState<ReservationItem | null>(null);

  const deleteReservationMutation = useMutation(
    orpc.deleteMyReservation.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.getMyReservations.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.getMyAccount.key(),
          }),
        ]);
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
                  <p className="font-medium">{formatDateLong(reservation.date)}</p>
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
                    <Button type="button" onClick={() => setActiveCheckInReservation(reservation)}>
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

      {isMobile && activeCheckInReservation ? (
        <MobileCheckInCamera reservation={activeCheckInReservation} onClose={() => setActiveCheckInReservation(null)} />
      ) : null}
    </>
  );
}
