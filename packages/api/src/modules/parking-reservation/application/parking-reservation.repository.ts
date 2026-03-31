export type ParkingSpotSummary = {
  id: string;
  name: string;
  charger: boolean;
};

export type ParkingReservationRepository = {
  findReservationActor(): Promise<{ userId: string; carId: string } | null>;
  findReservedSpotIdsForDate(date: Date): Promise<string[]>;
  findFirstAvailableSpot(
    excludedSpotIds: string[],
  ): Promise<ParkingSpotSummary | null>;
  findAvailableParkingSpots(
    excludedSpotIds: string[],
  ): Promise<ParkingSpotSummary[]>;
  countAvailableParkingSpots(): Promise<number>;
  createReservation(input: {
    userId: string;
    carId: string;
    parkingSpotId: string;
    date: Date;
  }): Promise<{ id: string; parkingSpot: ParkingSpotSummary }>;
};
