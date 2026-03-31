import prisma from "@hitachi2/db";
import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import { parkingReservationRouter } from "../modules/parking-reservation/router";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  dbCheck: publicProcedure.handler(async () => {
    await prisma.$queryRaw`SELECT 1`;

    return {
      ok: true,
      checkedAt: new Date().toISOString(),
    };
  }),
  ...parkingReservationRouter,
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
