import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { UserRole } from "@/lib/enum";
import { ReservationsTable } from "./components/ReservationsTable";

export default async function ReservationsPage() {
  const session = await getServerSession();

  if (!session?.user) redirect("/login");
  if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SECRETARY) redirect("/dashboard");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold">Reservations</h1>
      <ReservationsTable />
    </div>
  );
}
