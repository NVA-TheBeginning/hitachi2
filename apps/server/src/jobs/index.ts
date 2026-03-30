import type { PgBoss } from "pg-boss";

export async function registerWorkers(boss: PgBoss) {
  await boss.createQueue("send-email");
  await boss.work<{ to: string; subject: string }>(
    "send-email",
    async (jobs) => {
      for (const job of jobs) {
        console.log("Processing send-email job", job.id, job.data);
      }
    },
  );
}
