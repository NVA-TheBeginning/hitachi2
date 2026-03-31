import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { publicProcedure } from "../../index";
import { getAvailableParkingSpots } from "./application/get-available-parking-spots";
import { reserveParkingSpot } from "./application/reserve-parking-spot";
import {
  NoParkingSpotAvailableError,
  SeedDataMissingError,
} from "./domain/errors";
import { prismaParkingReservationRepository } from "./infrastructure/prisma-parking-reservation-repository";

const reservationDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit etre au format YYYY-MM-DD.");

const optionalReservationDateSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue === "" ? undefined : trimmedValue;
}, reservationDateSchema.optional());

export const parkingReservationRouter = {
  getAvailableParkingSpots: publicProcedure
    .input(
      z
        .object({
          date: optionalReservationDateSchema,
        })
        .optional(),
    )
    .handler(async ({ input }) => {
      return getAvailableParkingSpots(
        prismaParkingReservationRepository,
        input,
      );
    }),
  reserveParkingSpot: publicProcedure
    .input(
      z.object({
        date: reservationDateSchema,
      }),
    )
    .handler(async ({ input }) => {
      try {
        return await reserveParkingSpot(
          prismaParkingReservationRepository,
          input,
        );
      } catch (error) {
        if (error instanceof NoParkingSpotAvailableError) {
          throw new ORPCError("CONFLICT", {
            message: error.message,
          });
        }

        if (error instanceof SeedDataMissingError) {
          throw new ORPCError("PRECONDITION_FAILED", {
            message: error.message,
          });
        }

        throw error;
      }
    }),
};
