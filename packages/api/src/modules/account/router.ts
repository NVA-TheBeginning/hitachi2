import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../index";
import { createMyCar } from "./application/create-my-car";
import { deleteMyCar } from "./application/delete-my-car";
import { getMyAccount } from "./application/get-my-account";
import { updateMyCar } from "./application/update-my-car";
import {
  AccountNotFoundError,
  CarDeletionForbiddenError,
  CarLicensePlateAlreadyUsedError,
  CarNotFoundError,
} from "./domain/errors";
import { PrismaAccountRepository } from "./infrastructure/account-repository";

const repository = new PrismaAccountRepository();

function normalizeLicensePlate(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

const carPayloadSchema = z.object({
  name: z.string().trim().min(2, "Le nom du vehicule doit contenir au moins 2 caracteres.").max(80),
  licensePlate: z
    .string()
    .trim()
    .min(2, "La plaque doit contenir au moins 2 caracteres.")
    .max(20, "La plaque ne peut pas depasser 20 caracteres.")
    .regex(/^[A-Z0-9 -]+$/i, "La plaque ne peut contenir que des lettres, chiffres, espaces et tirets.")
    .transform(normalizeLicensePlate),
  electric: z.boolean(),
});

function handleAccountError(error: unknown): never {
  if (error instanceof AccountNotFoundError || error instanceof CarNotFoundError) {
    throw new ORPCError("NOT_FOUND", { message: error.message });
  }

  if (error instanceof CarLicensePlateAlreadyUsedError || error instanceof CarDeletionForbiddenError) {
    throw new ORPCError("CONFLICT", { message: error.message });
  }

  throw error;
}

export const accountRouter = {
  getMyAccount: protectedProcedure.handler(async ({ context }) => {
    try {
      return await getMyAccount(repository, {
        userId: context.session.user.id,
      });
    } catch (error) {
      handleAccountError(error);
    }
  }),

  createMyCar: protectedProcedure.input(carPayloadSchema).handler(async ({ input, context }) => {
    try {
      return await createMyCar(repository, {
        ...input,
        userId: context.session.user.id,
      });
    } catch (error) {
      handleAccountError(error);
    }
  }),

  updateMyCar: protectedProcedure
    .input(
      carPayloadSchema.extend({
        carId: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      try {
        return await updateMyCar(repository, {
          ...input,
          userId: context.session.user.id,
        });
      } catch (error) {
        handleAccountError(error);
      }
    }),

  deleteMyCar: protectedProcedure.input(z.object({ carId: z.string() })).handler(async ({ input, context }) => {
    try {
      return await deleteMyCar(repository, {
        ...input,
        userId: context.session.user.id,
      });
    } catch (error) {
      handleAccountError(error);
    }
  }),
};
