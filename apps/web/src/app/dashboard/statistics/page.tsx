import { UserRole } from "@hitachi2/db/enums";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-client";
import { StatisticsCards } from "./components/StatisticsCards";

export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  const session = await getServerSession();

  if (!session.data?.user) redirect("/login");
  if (session.data.user.role !== UserRole.MANAGER) redirect("/dashboard");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold">Statistiques</h1>
      <StatisticsCards />
    </div>
  );
}
