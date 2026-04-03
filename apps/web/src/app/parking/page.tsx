import { redirect } from "next/navigation";
import { ParkingMap } from "@/components/parking-map";
import { getServerSession } from "@/lib/auth-client";

export const dynamic = "force-dynamic";

export default async function ParkingPage() {
  const session = await getServerSession();

  if (!session.data?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <ParkingMap />
    </div>
  );
}
