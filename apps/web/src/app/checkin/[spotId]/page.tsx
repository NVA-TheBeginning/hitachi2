import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";
import { CheckInContent } from "./check-in-content";

export default async function CheckInPage({ params }: { params: Promise<{ spotId: string }> }) {
  const [session, { spotId }] = await Promise.all([getServerSession(), params]);

  if (!session?.user) {
    redirect(`/login?redirect=/checkin/${spotId}`);
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-12 text-center">
      <CheckInContent spotId={spotId} />
    </div>
  );
}
