import { ReservationStatus } from "@hitachi2/db";
import { z } from "zod";
import { toReservationDate } from "../../helpers";
import { handleError } from "../../helpers/handle-error";
import { managerProcedure, protectedProcedure, publicProcedure, secretaryProcedure } from "../../index";
import { QUEUE_NAMES } from "../../types";
import { confirmArrivalAtSpot } from "./application/check-in-by-spot";
import { deleteMyReservation } from "./application/delete-my-reservation";
import { getMyReservations } from "./application/get-my-reservations";
import { getNoShowRate } from "./application/get-no-show-rate";
import { getParkingLotUtilization } from "./application/get-slot-occupancy";
import { releaseAndGetAvailableParkingSpots } from "./application/release-and-get-available-parking-spots";
import { reserveParkingSpot } from "./application/reserve-parking-spot";
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
        const result = await reserveParkingSpot(repository, {
          carId: input.carId,
          date: input.date,
          userId: context.session.user.id,
        });

        context.jobQueue
          ?.send(QUEUE_NAMES.SEND_EMAIL, {
            to: context.session.user.email,
            subject: "Reservation confirmed",
            reservationId: result.reservationId,
            date: input.date,
            parkingSpotName: result.parkingSpot.name,
          })
          .catch((err: unknown) => console.error("Failed to queue reservation email", err));

        return result;
      } catch (error) {
        handleError(error);
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
      return releaseAndGetAvailableParkingSpots(repository, input);
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
        handleError(error);
      }
    }),

  confirmArrivalAtSpot: protectedProcedure.input(z.object({ spotId: z.string() })).handler(async ({ input, context }) => {
    try {
      return await confirmArrivalAtSpot(repository, {
        spotId: input.spotId,
        userId: context.session.user.id,
      });
    } catch (error) {
      handleError(error);
    }
  }),

  getAllParkingSpots: protectedProcedure.handler(() => {
    return repository.findAllParkingSpots();
  }),

  getParkingLotUtilization: managerProcedure
    .input(
      z
        .object({
          date: reservationDateSchema.optional(),
        })
        .optional(),
    )
    .handler(({ input }) => {
      return getParkingLotUtilization(repository, { date: input?.date });
    }),

  getNoShowRate: protectedProcedure
    .input(
      z
        .object({
          startDate: reservationDateSchema.optional(),
          endDate: reservationDateSchema.optional(),
        })
        .optional(),
    )
    .handler(({ input, context }) => {
      return getNoShowRate(repository, {
        userId: context.session.user.id,
        startDate: input?.startDate,
        endDate: input?.endDate,
      });
    }),

  getAllReservations: secretaryProcedure
    .input(
      z
        .object({
          userId: z.string().optional(),
          startDate: reservationDateSchema.optional(),
          endDate: reservationDateSchema.optional(),
          status: z.enum(ReservationStatus).optional(),
        })
        .optional(),
    )
    .handler(({ input }) => {
      const { startDate, endDate, ...rest } = input ?? {};
      return repository.getAllReservations({
        ...rest,
        ...(startDate && { startDate: toReservationDate(startDate) }),
        ...(endDate && { endDate: toReservationDate(endDate) }),
      });
    }),

  finalizeReservation: secretaryProcedure
    .input(
      z.object({
        reservationId: z.string(),
        status: z.enum(ReservationStatus),
      }),
    )
    .handler(async ({ input }) => {
      try {
        await repository.finalizeReservation(input.reservationId, input.status);
      } catch (error) {
        handleError(error);
      }
    }),

  deleteReservation: secretaryProcedure.input(z.object({ reservationId: z.string() })).handler(async ({ input }) => {
    try {
      await repository.deleteReservation(input.reservationId);
    } catch (error) {
      handleError(error);
    }
  }),
};
