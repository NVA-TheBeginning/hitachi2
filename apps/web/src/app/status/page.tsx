import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-client";

import StatusContent from "./status-content";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const session = await getServerSession();

  if (!session.data?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <StatusContent />
    </div>
  );
}
