import prisma from "@hitachi2/db";
import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import { accountRouter } from "../modules/account/router";
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
  ...accountRouter,
  ...parkingReservationRouter,
  getSession: publicProcedure.handler(({ context }) => {
    return context.session;
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
