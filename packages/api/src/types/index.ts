import type { ReservationStatus } from "@hitachi2/db";

export interface JobQueue {
  send<T extends object>(name: string, data: T): Promise<string | null>;
}

export type ParkingSpotSummary = {
  id: string;
  name: string;
  charger: boolean;
};

export interface IReservationRepository {
  findReservationActor(): Promise<{ userId: string; carId: string } | null>;
export type CarSummary = {
  id: string;
  name: string;
  licensePlate: string;
  electric: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AccountSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
  cars: CarSummary[];
};

export type ParkingReservationRepository = {
  findReservationActor(
    userId: string,
  ): Promise<{ userId: string; carId: string } | null>;
  findReservedSpotIdsForDate(date: Date): Promise<string[]>;
  findFirstAvailableSpot(excludedSpotIds: string[]): Promise<ParkingSpotSummary | null>;
  findAvailableSpots(excludedSpotIds: string[]): Promise<ParkingSpotSummary[]>;
  countAvailableParkingSpots(): Promise<number>;
  createReservation(input: {
    userId: string;
    carId: string;
    parkingSpotId: string;
    date: Date;
  }): Promise<{ id: string; parkingSpot: ParkingSpotSummary }>;
  findAndCreateReservation(
    date: Date,
    actor: { userId: string; carId: string },
  ): Promise<{
    id: string;
    parkingSpot: ParkingSpotSummary;
    remainingSpots: number;
  } | null>;
  findReservationById(id: string): Promise<{ id: string; userId: string; status: ReservationStatus } | null>;
  checkInReservation(reservationId: string): Promise<{ checkedAt: Date }>;
  getUserReservations(userId: string): Promise<{ reservationCount: number; role: UserRole }>;
}

export type AccountRepository = {
  findAccountByUserId(userId: string): Promise<AccountSummary | null>;
  updateAccountName(userId: string, name: string): Promise<AccountSummary>;
  findCarByIdForUser(carId: string, userId: string): Promise<CarSummary | null>;
  findCarByLicensePlate(
    licensePlate: string,
  ): Promise<{ id: string; userId: string } | null>;
  createCar(input: {
    userId: string;
    name: string;
    licensePlate: string;
    electric: boolean;
  }): Promise<CarSummary>;
  updateCar(input: {
    carId: string;
    name: string;
    licensePlate: string;
    electric: boolean;
  }): Promise<CarSummary>;
  countReservationsForCar(carId: string): Promise<number>;
  deleteCar(carId: string): Promise<void>;
};
