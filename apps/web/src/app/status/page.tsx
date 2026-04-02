import { redirect } from "next/navigation";

import { client } from "@/utils/orpc";

import StatusContent from "./status-content";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const session = await client.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <StatusContent />
    </div>
  );
}
