"use client";

import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

export default function StatusContent() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const dbCheck = useQuery({
    ...orpc.dbCheck.queryOptions(),
    enabled: false,
    retry: false,
  });

  const dbStatusClass = dbCheck.isFetching
    ? "bg-yellow-500"
    : dbCheck.isSuccess
      ? "bg-green-500"
      : dbCheck.isError
        ? "bg-red-500"
        : "bg-muted-foreground/30";

  const dbStatusLabel = dbCheck.isFetching
    ? "Checking..."
    : dbCheck.isSuccess
      ? "BDD connectee"
      : dbCheck.isError
        ? "BDD indisponible"
        : "Pas encore verifiee";

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border p-4">
        <h2 className="mb-2 font-medium">API Status</h2>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm text-muted-foreground">
            {healthCheck.isLoading ? "Checking..." : healthCheck.data ? "Connected" : "Disconnected"}
          </span>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h2 className="font-medium">Database Status</h2>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${dbStatusClass}`} />
              <span className="text-sm text-muted-foreground">{dbStatusLabel}</span>
            </div>
            {dbCheck.isSuccess ? (
              <p className="text-xs text-muted-foreground">
                Derniere verification:{" "}
                {new Intl.DateTimeFormat("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "medium",
                }).format(new Date(dbCheck.data.checkedAt))}
              </p>
            ) : null}
            {dbCheck.isError ? <p className="text-xs text-destructive">{dbCheck.error.message}</p> : null}
          </div>

          <Button onClick={() => void dbCheck.refetch()} disabled={dbCheck.isFetching}>
            {dbCheck.isFetching ? "Verification..." : "Checker la BDD"}
          </Button>
        </div>
      </section>
    </div>
  );
}
