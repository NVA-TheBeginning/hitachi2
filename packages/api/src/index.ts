import { UserRole } from "@hitachi2/db";
import { ORPCError, os } from "@orpc/server";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requireSecretary = protectedProcedure.use(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  if (context.session.user.role !== UserRole.MANAGER && context.session.user.role !== UserRole.SECRETARY) {
    throw new ORPCError("FORBIDDEN", { message: "Access denied. Secretary or Manager role required." });
  }
  return next({ context });
});

const requireManager = protectedProcedure.use(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  if (context.session.user.role !== UserRole.MANAGER) {
    throw new ORPCError("FORBIDDEN", { message: "Access denied. Manager role required." });
  }
  return next({ context });
});

export const secretaryProcedure = requireSecretary;
export const managerProcedure = requireManager;
