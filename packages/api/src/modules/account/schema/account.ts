import { z } from "zod";

export const accountNameSchema = z.string().trim().min(2).max(80);
export const carNameSchema = z.string().trim().min(2).max(80);
export const licensePlateSchema = z.string().trim().min(2).max(32);

export const updateMyAccountInputSchema = z.object({
  name: accountNameSchema,
});

export const createMyCarInputSchema = z.object({
  name: carNameSchema,
  licensePlate: licensePlateSchema,
  electric: z.boolean(),
});

export const updateMyCarInputSchema = z.object({
  carId: z.string(),
  name: carNameSchema,
  licensePlate: licensePlateSchema,
  electric: z.boolean(),
});

export const deleteMyCarInputSchema = z.object({
  carId: z.string(),
});
