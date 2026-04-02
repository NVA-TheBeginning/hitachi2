import { redirect } from "next/navigation";
import { ParkingMap } from "@/components/parking-map";
import { client } from "@/utils/orpc";

export const dynamic = "force-dynamic";

export default async function ParkingPage() {
  const session = await client.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <ParkingMap />
    </div>
  );
}
