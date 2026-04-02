import { redirect } from "next/navigation";
import { UserRole } from "@/lib/enum";
import { client } from "@/utils/orpc";
import { ReservationsTable } from "./components/ReservationsTable";

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  const session = await client.getSession();

  if (!session?.user) redirect("/login");
  if (session.user.role !== UserRole.SECRETARY) redirect("/dashboard");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold">Reservations</h1>
      <ReservationsTable />
    </div>
  );
}
