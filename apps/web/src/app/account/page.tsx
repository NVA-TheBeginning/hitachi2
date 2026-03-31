import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";

import AccountContent from "./account-content";

export default async function AccountPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <AccountContent />
    </div>
  );
}
