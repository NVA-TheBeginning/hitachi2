import type { ReservationStatus, UserRole } from "@hitachi2/db";

export interface JobQueue {
  send<T extends object>(name: string, data: T): Promise<string | null>;
}

export type ParkingSpotSummary = {
  id: string;
  name: string;
  charger: boolean;
};

export type ReservationActor = {
  userId: string;
  carId: string;
  electric: boolean;
};

export interface IReservationRepository {
  findReservationActor(userId: string, carId?: string): Promise<ReservationActor | null>;
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
    actor: ReservationActor,
  ): Promise<{
    id: string;
    parkingSpot: ParkingSpotSummary;
    remainingSpots: number;
  } | null>;
  findParkingSpotById(spotId: string): Promise<ParkingSpotSummary | null>;
  findTodayReservationForUserAndSpot(
    userId: string,
    spotId: string,
    today: Date,
  ): Promise<{ id: string; status: ReservationStatus } | null>;
  findAllParkingSpots(): Promise<ParkingSpotSummary[]>;
  checkInReservation(reservationId: string): Promise<{ checkedAt: Date }>;
  getUserReservations(userId: string): Promise<{ reservationCount: number; role: UserRole }>;
}

export type UserCarSummary = {
  id: string;
  name: string;
  licensePlate: string | null;
  electric: boolean;
  reservationCount: number;
};

export interface IAccountRepository {
  getMyAccount(userId: string): Promise<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: Date;
    cars: UserCarSummary[];
  } | null>;
  findUserCarById(userId: string, carId: string): Promise<UserCarSummary | null>;
  createUserCar(input: {
    userId: string;
    name: string;
    licensePlate: string;
    electric: boolean;
  }): Promise<UserCarSummary>;
  updateUserCar(input: {
    carId: string;
    name: string;
    licensePlate: string;
    electric: boolean;
  }): Promise<UserCarSummary>;
  deleteUserCar(carId: string): Promise<void>;
}
