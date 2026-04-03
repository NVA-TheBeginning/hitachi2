import { redirect } from "next/navigation";
import { MyReservationsCard } from "@/components/my-reservations-card";
import { ParkingReservationCard } from "@/components/parking-reservation-card";
import { getServerSession } from "@/lib/auth-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session.data?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome {session.data.user.name}</p>
        </section>

        <ParkingReservationCard />
        <MyReservationsCard />
      </div>
    </div>
  );
}
