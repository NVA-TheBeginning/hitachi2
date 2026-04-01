"use client";

import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";

import { orpc } from "@/utils/orpc";

export function QrCodeGrid() {
  const { data: spots, isPending, isError } = useQuery(orpc.getAllParkingSpots.queryOptions());

  if (isPending) return <p className="text-muted-foreground">Chargement...</p>;

  if (isError) return <p className="text-destructive">Erreur lors du chargement des places de parking.</p>;

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-4">
      {spots?.map((spot) => (
        <div key={spot.id} className="flex flex-col items-center gap-2 rounded-lg border p-4 print:break-inside-avoid">
          <QRCodeSVG value={`${window.location.origin}/checkin/${spot.id}`} size={160} />
          <p className="text-center font-medium">{spot.name}</p>
          {spot.charger && <span className="text-muted-foreground text-xs">Borne electrique</span>}
        </div>
      ))}
    </div>
  );
}
