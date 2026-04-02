import type { ReservationStatus, UserRole } from "@hitachi2/db";

export const QUEUE_NAMES = {
  SEND_EMAIL: "send-email",
} as const;

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

export type UserReservationSummary = {
  id: string;
  date: Date;
  status: ReservationStatus;
  car: {
    id: string;
    name: string;
    licensePlate: string | null;
    electric: boolean;
  };
  parkingSpot: ParkingSpotSummary;
};

export interface IReservationRepository {
  findReservationActor(userId: string, carId?: string): Promise<ReservationActor | null>;
  findReservedSpotIdsForDate(date: Date): Promise<string[]>;
  releaseUncheckedReservations(date: Date): Promise<void>;
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
  getMyReservations(userId: string): Promise<UserReservationSummary[]>;
  findReservationById(reservationId: string): Promise<{ id: string; userId: string; status: ReservationStatus } | null>;
  deleteReservation(reservationId: string): Promise<void>;
  findAllParkingSpots(): Promise<ParkingSpotSummary[]>;
  checkInReservation(reservationId: string): Promise<{ checkedAt: Date }>;
  getUserReservations(userId: string): Promise<{ reservationCount: number; role: UserRole }>;
  getNoShowStats(input: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ totalReservations: number; noShowCount: number; completedCount: number; rate: number }>;
  getSlotOccupancyStats(date: Date): Promise<{
    totalSlots: number;
    occupiedSlots: number;
    occupancyRate: number;
    totalElectricSlots: number;
    occupiedElectricSlots: number;
    electricOccupancyRate: number;
  }>;
}

export type UserCarSummary = {
  id: string;
  name: string;
  licensePlate: string | null;
  electric: boolean;
  reservationCount: number;
};

export type UserReservationQuotaSummary = {
  reservationCount: number;
  maxReservations: number;
  remainingReservations: number;
};

export type AccountSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  cars: UserCarSummary[];
  reservationQuota: UserReservationQuotaSummary;
};

export interface IAccountRepository {
  getMyAccount(userId: string): Promise<AccountSummary | null>;
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
