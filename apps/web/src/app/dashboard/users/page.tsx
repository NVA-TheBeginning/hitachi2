import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { UserRole } from "@/lib/enum";
import { UsersTable } from "./components/UsersTable";

export default async function UsersPage() {
  const session = await getServerSession();

  if (!session?.data?.user) redirect("/login");
  if (session.data.user.role !== UserRole.SECRETARY) redirect("/dashboard");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold">Utilisateurs</h1>
      <UsersTable />
    </div>
  );
}
