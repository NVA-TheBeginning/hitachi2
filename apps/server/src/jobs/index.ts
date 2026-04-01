import { QUEUE_NAMES } from "@hitachi2/api/types/index";
import { env } from "@hitachi2/env/server";
import type { PgBoss } from "pg-boss";
import { UseSend } from "usesend-js";

type SendEmailJob = {
  to: string;
  subject: string;
  reservationId: string;
  date: string;
  parkingSpotName: string;
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function registerWorkers(boss: PgBoss) {
  const usesend = new UseSend(env.USESEND_API_KEY);

  await boss.createQueue(QUEUE_NAMES.SEND_EMAIL);
  await boss.work<SendEmailJob>(QUEUE_NAMES.SEND_EMAIL, async (jobs) => {
    await Promise.all(
      jobs.map((job) => {
        const { to, subject, reservationId, date, parkingSpotName } = job.data;
        return usesend.emails.send({
          to,
          from: env.EMAIL_FROM,
          subject,
          html: `<p>Your reservation <strong>${esc(reservationId)}</strong> for spot <strong>${esc(parkingSpotName)}</strong> on <strong>${esc(date)}</strong> is confirmed.</p>`,
          text: `Your reservation ${reservationId} for spot ${parkingSpotName} on ${date} is confirmed.`,
        });
      }),
    );
  });
}
