import { z } from "zod";

export const reservationDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit etre au format YYYY-MM-DD.");

export const optionalReservationDateSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  reservationDateSchema.optional(),
);

export const reserveParkingSpotInputSchema = z.object({
  date: reservationDateSchema,
});

export const getAvailableParkingSpotsInputSchema = z
  .object({
    date: optionalReservationDateSchema,
  })
  .optional();

export const checkInInputSchema = z.object({
  reservationId: z.string(),
});
