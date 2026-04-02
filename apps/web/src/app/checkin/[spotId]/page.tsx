import { redirect } from "next/navigation";

import { client } from "@/utils/orpc";
import { CheckInContent } from "./check-in-content";

export const dynamic = "force-dynamic";

export default async function CheckInPage({ params }: { params: Promise<{ spotId: string }> }) {
  const [session, { spotId }] = await Promise.all([client.getSession(), params]);

  if (!session?.user) {
    redirect(`/login?redirect=/checkin/${spotId}`);
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-12 text-center">
      <CheckInContent spotId={spotId} />
    </div>
  );
}
