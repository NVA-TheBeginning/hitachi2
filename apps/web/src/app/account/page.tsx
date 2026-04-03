import { redirect } from "next/navigation";
import AccountPageContent from "@/components/account-page-content";
import { getServerSession } from "@/lib/auth-client";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession();

  if (!session.data?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 space-y-2 rounded-lg border p-4">
        <h1 className="text-2xl font-semibold">Mon compte</h1>
        <p className="text-muted-foreground">Gere tes informations de profil et les voitures liees a ton compte.</p>
      </div>

      <AccountPageContent />
    </div>
  );
}
