import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { publicProcedure } from "../../index";
import { reserveParkingSpot } from "./application/reserve-parking-spot";
import {
  NoParkingSpotAvailableError,
  SeedDataMissingError,
} from "./domain/errors";
import { prismaParkingReservationRepository } from "./infrastructure/prisma-parking-reservation-repository";

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
};
