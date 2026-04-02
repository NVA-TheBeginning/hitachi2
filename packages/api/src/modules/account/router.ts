import { UserRole } from "@hitachi2/db";
import { z } from "zod";
import { handleError } from "../../helpers/handle-error";
import { protectedProcedure, secretaryProcedure } from "../../index";
import { createMyCar } from "./application/create-my-car";
import { deleteMyCar } from "./application/delete-my-car";
import { getMyAccount } from "./application/get-my-account";
import { updateMyCar } from "./application/update-my-car";
import { PrismaAccountRepository } from "./infrastructure/account-repository";

const repository = new PrismaAccountRepository();

const carPayloadSchema = z.object({
  name: z.string().trim().min(2, "Le nom du vehicule doit contenir au moins 2 caracteres.").max(80),
  licensePlate: z
    .string()
    .trim()
    .min(2, "La plaque doit contenir au moins 2 caracteres.")
    .max(20, "La plaque ne peut pas depasser 20 caracteres.")
    .regex(/^[A-Z0-9 -]+$/i, "La plaque ne peut contenir que des lettres, chiffres, espaces et tirets.")
    .transform((v) => v.trim().replace(/\s+/g, " ").toUpperCase()),
  electric: z.boolean(),
});

const updateUserSchema = z.object({
  userId: z.string(),
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(UserRole).optional(),
});

export const accountRouter = {
  getMyAccount: protectedProcedure.handler(async ({ context }) => {
    try {
      return await getMyAccount(repository, {
        userId: context.session.user.id,
      });
    } catch (error) {
      handleError(error);
    }
  }),

  createMyCar: protectedProcedure.input(carPayloadSchema).handler(async ({ input, context }) => {
    try {
      return await createMyCar(repository, {
        ...input,
        userId: context.session.user.id,
      });
    } catch (error) {
      handleError(error);
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
        handleError(error);
      }
    }),

  deleteMyCar: protectedProcedure.input(z.object({ carId: z.string() })).handler(async ({ input, context }) => {
    try {
      return await deleteMyCar(repository, {
        ...input,
        userId: context.session.user.id,
      });
    } catch (error) {
      handleError(error);
    }
  }),

  getAllUsers: secretaryProcedure.handler(async () => {
    try {
      return await repository.getAllUsers();
    } catch (error) {
      handleError(error);
    }
  }),

  getUserById: secretaryProcedure.input(z.object({ userId: z.string() })).handler(async ({ input }) => {
    try {
      return await repository.getUserById(input.userId);
    } catch (error) {
      handleError(error);
    }
  }),

  updateUser: secretaryProcedure.input(updateUserSchema).handler(async ({ input }) => {
    try {
      return await repository.updateUser(input);
    } catch (error) {
      handleError(error);
    }
  }),

  deleteUser: secretaryProcedure.input(z.object({ userId: z.string() })).handler(async ({ input }) => {
    try {
      await repository.deleteUser(input.userId);
    } catch (error) {
      handleError(error);
    }
  }),
};
