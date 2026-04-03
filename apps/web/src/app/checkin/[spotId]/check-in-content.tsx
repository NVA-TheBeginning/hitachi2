"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";

import { orpc } from "@/utils/orpc";

export function CheckInContent({ spotId }: { spotId: string }) {
  const { mutate, ...mutation } = useMutation(orpc.confirmArrivalAtSpot.mutationOptions());

  useEffect(() => {
    mutate({ spotId });
  }, [spotId, mutate]);

  if (mutation.isPending) return <p className="text-muted-foreground">Validation en cours...</p>;

  if (mutation.isSuccess)
    return (
      <div className="space-y-2">
        <p className="text-xl font-semibold">Presence validee</p>
        <p className="text-muted-foreground">Valide a {mutation.data.checkedAt.toLocaleTimeString()}</p>
      </div>
    );

  if (mutation.isError) return <p className="text-destructive">{mutation.error.message}</p>;

  return null;
}
