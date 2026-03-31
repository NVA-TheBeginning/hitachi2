import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";

import StatusContent from "./status-content";

export default async function StatusPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <StatusContent />
    </div>
  );
}
