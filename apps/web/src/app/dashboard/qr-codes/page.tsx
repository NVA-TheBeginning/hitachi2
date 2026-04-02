import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { UserRole } from "@/lib/enum";
import { QrCodeGrid } from "./qr-code-grid";

export default async function QrCodesPage() {
  const session = await getServerSession();

  if (!session?.data?.user) redirect("/login");
  if (session.data.user.role !== UserRole.MANAGER) redirect("/dashboard");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold">QR codes des places</h1>
      <QrCodeGrid />
    </div>
  );
}
