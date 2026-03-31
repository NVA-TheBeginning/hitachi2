import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure } from "../../index";
import {
  createMyCar,
  deleteMyCar,
  getMyAccount,
  updateMyAccount,
  updateMyCar,
} from "./application/manage-account";
import {
  AccountNotFoundError,
  CarDeletionForbiddenError,
  CarNotFoundError,
  DuplicateLicensePlateError,
} from "./domain/errors";
import { prismaAccountRepository } from "./infrastructure/prisma-account-repository";

const accountNameSchema = z.string().trim().min(2).max(80);
const carNameSchema = z.string().trim().min(2).max(80);
const licensePlateSchema = z.string().trim().min(2).max(32);

function mapAccountError(error: unknown): never {
  if (error instanceof AccountNotFoundError) {
    throw new ORPCError("NOT_FOUND", { message: error.message });
  }

  if (error instanceof CarNotFoundError) {
    throw new ORPCError("NOT_FOUND", { message: error.message });
  }

  if (error instanceof DuplicateLicensePlateError) {
    throw new ORPCError("CONFLICT", { message: error.message });
  }

  if (error instanceof CarDeletionForbiddenError) {
    throw new ORPCError("CONFLICT", { message: error.message });
  }

  throw error;
}

export const accountRouter = {
  getMyAccount: protectedProcedure.handler(async ({ context }) => {
    try {
      return await getMyAccount(
        prismaAccountRepository,
        context.session.user.id,
      );
    } catch (error) {
      mapAccountError(error);
    }
  }),

  updateMyAccount: protectedProcedure
    .input(
      z.object({
        name: accountNameSchema,
      }),
    )
    .handler(async ({ input, context }) => {
      try {
        return await updateMyAccount(prismaAccountRepository, {
          userId: context.session.user.id,
          name: input.name,
        });
      } catch (error) {
        mapAccountError(error);
      }
    }),

  createMyCar: protectedProcedure
    .input(
      z.object({
        name: carNameSchema,
        licensePlate: licensePlateSchema,
        electric: z.boolean(),
      }),
    )
    .handler(async ({ input, context }) => {
      try {
        return await createMyCar(prismaAccountRepository, {
          userId: context.session.user.id,
          name: input.name,
          licensePlate: input.licensePlate,
          electric: input.electric,
        });
      } catch (error) {
        mapAccountError(error);
      }
    }),

  updateMyCar: protectedProcedure
    .input(
      z.object({
        carId: z.string(),
        name: carNameSchema,
        licensePlate: licensePlateSchema,
        electric: z.boolean(),
      }),
    )
    .handler(async ({ input, context }) => {
      try {
        return await updateMyCar(prismaAccountRepository, {
          userId: context.session.user.id,
          carId: input.carId,
          name: input.name,
          licensePlate: input.licensePlate,
          electric: input.electric,
        });
      } catch (error) {
        mapAccountError(error);
      }
    }),

  deleteMyCar: protectedProcedure
    .input(
      z.object({
        carId: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      try {
        return await deleteMyCar(prismaAccountRepository, {
          userId: context.session.user.id,
          carId: input.carId,
        });
      } catch (error) {
        mapAccountError(error);
      }
    }),
};
