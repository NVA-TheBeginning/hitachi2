import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../../index";
import { checkInReservation } from "./application/check-in-reservation";
import { publicProcedure } from "../../index";
import { getAvailableParkingSpots } from "./application/get-available-parking-spots";
import { reserveParkingSpot } from "./application/reserve-parking-spot";
import {
  NoParkingSpotAvailableError,
  ReservationAlreadyCheckedInError,
  ReservationForbiddenError,
  ReservationNotFoundError,
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
  reserveParkingSpot: publicProcedure
    .input(
      z.object({
        date: z
          .string()
          .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            "La date doit etre au format YYYY-MM-DD.",
          ),
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

  checkIn: protectedProcedure
    .input(z.object({ reservationId: z.string() }))
    .handler(async ({ input, context }) => {
      try {
        return await checkInReservation(prismaParkingReservationRepository, {
          reservationId: input.reservationId,
          userId: context.session.user.id,
        });
      } catch (error) {
        if (error instanceof ReservationNotFoundError) {
          throw new ORPCError("NOT_FOUND", { message: error.message });
        }

        if (error instanceof ReservationForbiddenError) {
          throw new ORPCError("FORBIDDEN", { message: error.message });
        }

        if (error instanceof ReservationAlreadyCheckedInError) {
          throw new ORPCError("CONFLICT", { message: error.message });
        }

        throw error;
      }
    }),
};
