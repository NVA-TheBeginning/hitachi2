import { describe, expect, test } from "bun:test";
import { reserveParkingSpot } from "../src/modules/parking-reservation/application/reserve-parking-spot";
import {
  NoParkingSpotAvailableError,
  SeedDataMissingError,
} from "../src/modules/parking-reservation/domain/errors";

describe("reserveParkingSpot", () => {
  test("should reserve the first available spot for a date", async () => {
    const reservations: string[] = [];

    const repository = {
      async findReservationActor() {
        return { userId: "seeded-user", carId: "seeded-car" };
      },
      async findReservedSpotIdsForDate() {
        return reservations;
      },
      async findFirstAvailableSpot(excludedSpotIds: string[]) {
        if (excludedSpotIds.includes("spot-a01")) {
          return { id: "spot-a02", name: "A02", charger: false };
        }

        return { id: "spot-a01", name: "A01", charger: true };
      },
      async countAvailableParkingSpots() {
        return 2;
      },
      async createReservation(input: { parkingSpotId: string }) {
        reservations.push(input.parkingSpotId);

        return {
          id: "reservation-1",
          parkingSpot:
            input.parkingSpotId === "spot-a01"
              ? { id: "spot-a01", name: "A01", charger: true }
              : { id: "spot-a02", name: "A02", charger: false },
        };
      },
    };

    const result = await reserveParkingSpot(repository, {
      date: "2026-04-01",
    });

    expect(result.reservationId).toBe("reservation-1");
    expect(result.parkingSpot.name).toBe("A01");
    expect(result.remainingSpots).toBe(1);
  });

  test("should fail when no parking spot is available", async () => {
    const repository = {
      async findReservationActor() {
        return { userId: "seeded-user", carId: "seeded-car" };
      },
      async findReservedSpotIdsForDate() {
        return ["spot-a01"];
      },
      async findFirstAvailableSpot() {
        return null;
      },
      async countAvailableParkingSpots() {
        return 1;
      },
      async createReservation() {
        throw new Error("should not create reservation");
      },
    };

    expect(
      reserveParkingSpot(repository, {
        date: "2026-04-01",
      }),
    ).rejects.toBeInstanceOf(NoParkingSpotAvailableError);
  });

  test("should fail when reservation seed data is missing", async () => {
    const repository = {
      async findReservationActor() {
        return null;
      },
      async findReservedSpotIdsForDate() {
        return [];
      },
      async findFirstAvailableSpot() {
        return { id: "spot-a01", name: "A01", charger: false };
      },
      async countAvailableParkingSpots() {
        return 10;
      },
      async createReservation() {
        throw new Error("should not create reservation");
      },
    };

    expect(
      reserveParkingSpot(repository, {
        date: "2026-04-01",
      }),
    ).rejects.toBeInstanceOf(SeedDataMissingError);
  });
});
