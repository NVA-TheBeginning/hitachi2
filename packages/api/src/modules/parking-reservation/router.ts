import { ORPCError } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../../index";
import { checkInReservation } from "./application/check-in-reservation";
import { getAvailableParkingSpots } from "./application/get-available-parking-spots";
import { reserveParkingSpot } from "./application/reserve-parking-spot";
import {
  NoParkingSpotAvailableError,
  ReservationAlreadyCheckedInError,
  ReservationForbiddenError,
  ReservationLimitExceededError,
  ReservationNotFoundError,
  SeedDataMissingError,
  UserCarMissingError,
} from "./domain/errors";
import { PrismaReservationRepository } from "./infrastructure/parking-reservation-repository";
import {
  checkInInputSchema,
  getAvailableParkingSpotsInputSchema,
  reserveParkingSpotInputSchema,
} from "./schema/parking-reservation";

const repository = new PrismaReservationRepository();

export const parkingReservationRouter = {
  reserveParkingSpot: protectedProcedure.input(reserveParkingSpotInputSchema).handler(async ({ input, context }) => {
    try {
      return await reserveParkingSpot(repository, {
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

      if (error instanceof SeedDataMissingError) {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: error.message,
        });
      }

      if (error instanceof UserCarMissingError) {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: error.message,
        });
      }

      throw error;
    }
  }),

  getAvailableParkingSpots: publicProcedure.input(getAvailableParkingSpotsInputSchema).handler(({ input }) => {
    return getAvailableParkingSpots(repository, input);
  }),

  checkIn: protectedProcedure.input(checkInInputSchema).handler(async ({ input, context }) => {
    try {
      return await checkInReservation(repository, {
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
