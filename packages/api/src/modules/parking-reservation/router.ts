import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../../index";
import { checkInBySpot } from "./application/check-in-by-spot";
import { deleteMyReservation } from "./application/delete-my-reservation";
import { getAvailableParkingSpots } from "./application/get-available-parking-spots";
import { getMyReservations } from "./application/get-my-reservations";
import { reserveParkingSpot } from "./application/reserve-parking-spot";
import {
  NoCarLinkedToUserError,
  NoParkingSpotAvailableError,
  NoReservationForSpotTodayError,
  ParkingSpotNotFoundError,
  ReservationAlreadyCheckedInError,
  ReservationCarNotFoundError,
  ReservationDeletionForbiddenError,
  ReservationForbiddenError,
  ReservationLimitExceededError,
  ReservationNotFoundError,
  SeedDataMissingError,
} from "./domain/errors";
import { PrismaReservationRepository } from "./infrastructure/parking-reservation-repository";

const repository = new PrismaReservationRepository();

const reservationDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit etre au format YYYY-MM-DD.");
const optionalReservationDateSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  reservationDateSchema.optional(),
);

export const parkingReservationRouter = {
  reserveParkingSpot: protectedProcedure
    .input(
      z.object({
        carId: z.string().optional(),
        date: reservationDateSchema,
      }),
    )
    .handler(async ({ input, context }) => {
      try {
        return await reserveParkingSpot(repository, {
          carId: input.carId,
          date: input.date,
          userId: context.session.user.id,
        });
      } catch (error) {
        if (error instanceof ReservationLimitExceededError) {
          throw new ORPCError("FORBIDDEN", {
            message: error.message,
          });
        }

        if (error instanceof NoParkingSpotAvailableError) {
          throw new ORPCError("CONFLICT", {
            message: error.message,
          });
        }

        if (error instanceof NoCarLinkedToUserError) {
          throw new ORPCError("PRECONDITION_FAILED", {
            message: error.message,
          });
        }

        if (error instanceof SeedDataMissingError) {
          throw new ORPCError("PRECONDITION_FAILED", {
            message: error.message,
          });
        }

        if (error instanceof ReservationCarNotFoundError) {
          throw new ORPCError("NOT_FOUND", {
            message: error.message,
          });
        }

        throw error;
      }
    }),

  getAvailableParkingSpots: publicProcedure
    .input(
      z
        .object({
          date: optionalReservationDateSchema,
        })
        .optional(),
    )
    .handler(({ input }) => {
      return getAvailableParkingSpots(repository, input);
    }),

  getMyReservations: protectedProcedure.handler(({ context }) => {
    return getMyReservations(repository, {
      userId: context.session.user.id,
    });
  }),

  deleteMyReservation: protectedProcedure
    .input(z.object({ reservationId: z.string() }))
    .handler(async ({ input, context }) => {
      try {
        return await deleteMyReservation(repository, {
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

        if (error instanceof ReservationDeletionForbiddenError) {
          throw new ORPCError("CONFLICT", { message: error.message });
        }

        throw error;
      }
    }),

  checkInBySpot: protectedProcedure.input(z.object({ spotId: z.string() })).handler(async ({ input, context }) => {
    try {
      return await checkInBySpot(repository, {
        spotId: input.spotId,
        userId: context.session.user.id,
      });
    } catch (error) {
      if (error instanceof ParkingSpotNotFoundError || error instanceof NoReservationForSpotTodayError) {
        throw new ORPCError("NOT_FOUND", { message: error.message });
      }

      if (error instanceof ReservationAlreadyCheckedInError) {
        throw new ORPCError("CONFLICT", { message: error.message });
      }

      throw error;
    }
  }),

  getAllParkingSpots: protectedProcedure.handler(() => {
    return repository.findAllParkingSpots();
  }),
};
