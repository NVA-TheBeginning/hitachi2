import { getCurrentReservationDateString, toReservationDate } from "@api/helpers";
import prisma, { ReservationStatus, UserRole } from "@hitachi2/db";
import type { Session, User } from "better-auth/types";

const PREFIX = "test-fixture";
let _counter = 0;
const counter = () => ++_counter;

export interface TestUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role?: UserRole;
}

export interface TestContext {
  context: {
    session: {
      session: Session;
      user: User & {
        role: UserRole;
      };
    };
    jobQueue: { send: (name: string, data: object) => Promise<string | null> };
  };
}

export function createContext(user: TestUser): TestContext {
  return {
    context: {
      session: {
        session: {
          id: `session-${user.id}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          token: `token-${user.id}`,
          ipAddress: "127.0.0.1",
          userAgent: "bun-test",
        },
        user: {
          id: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.name,
          image: null,
          role: user.role ?? UserRole.EMPLOYEE,
        },
      },
      jobQueue: { send: async () => null },
    },
  };
}

export const createEmployee = (overrides?: Partial<TestUser>): TestUser => ({
  id: `${PREFIX}-employee-${counter()}`,
  name: "Employee User",
  email: `employee-${counter()}@test.com`,
  emailVerified: true,
  role: UserRole.EMPLOYEE,
  ...overrides,
});

export const createSecretary = (overrides?: Partial<TestUser>): TestUser => ({
  id: `${PREFIX}-secretary-${counter()}`,
  name: "Secretary User",
  email: `secretary-${counter()}@test.com`,
  emailVerified: true,
  role: UserRole.SECRETARY,
  ...overrides,
});

export const createManager = (overrides?: Partial<TestUser>): TestUser => ({
  id: `${PREFIX}-manager-${counter()}`,
  name: "Manager User",
  email: `manager-${counter()}@test.com`,
  emailVerified: true,
  role: UserRole.MANAGER,
  ...overrides,
});

export const createTestUser = (overrides?: Partial<TestUser>): TestUser => ({
  id: `${PREFIX}-user-${counter()}`,
  name: "Test User",
  email: `test-${counter()}@test.com`,
  emailVerified: true,
  role: UserRole.EMPLOYEE,
  ...overrides,
});

export type TestCar = {
  id: string;
  user: { connect: { id: string } };
  name: string;
  licensePlate: string;
  electric: boolean;
};
export type TestSpot = {
  id: string;
  name: string;
  charger: boolean;
  available: boolean;
};

export const createCar = (userId: string, overrides?: Partial<TestCar>): TestCar => ({
  id: `${PREFIX}-car-${counter()}`,
  user: { connect: { id: userId } },
  name: "Test Car",
  licensePlate: `TC-${counter().toString().padStart(4, "0")}`,
  electric: false,
  ...overrides,
});

export const createSpot = (overrides?: Partial<TestSpot>): TestSpot => ({
  id: `${PREFIX}-spot-${counter()}`,
  name: `SPOT-${counter().toString().padStart(4, "0")}`,
  charger: false,
  available: true,
  ...overrides,
});

export const getUserIds = (...users: TestUser[]): string[] => users.map((u) => u.id);

export async function seedUsers(...users: TestUser[]) {
  const ids = users.map((u) => u.id);
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.user.createMany({ data: users });
}

export async function seedCars(...cars: TestCar[]) {
  for (const car of cars) {
    await prisma.car.upsert({
      where: { id: car.id },
      update: car,
      create: car,
    });
  }
}

export async function seedSpots(...spots: TestSpot[]) {
  for (const spot of spots) {
    await prisma.parkingSpot.upsert({
      where: { id: spot.id },
      update: spot,
      create: spot,
    });
  }
}

export async function cleanupUsers(...users: TestUser[]) {
  const ids = getUserIds(...users);
  await prisma.reservation.deleteMany({ where: { userId: { in: ids } } });
  await prisma.car.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

export async function cleanupCars(...carIds: string[]) {
  await prisma.reservation.deleteMany({ where: { carId: { in: carIds } } });
  await prisma.car.deleteMany({ where: { id: { in: carIds } } });
}

export async function cleanupSpots(...spotIds: string[]) {
  await prisma.reservation.deleteMany({ where: { parkingSpotId: { in: spotIds } } });
  await prisma.parkingSpot.deleteMany({ where: { id: { in: spotIds } } });
}

export async function createTodayReservation(
  spotId: string,
  carId: string,
  userId: string,
  status: ReservationStatus = ReservationStatus.RESERVED,
) {
  const today = toReservationDate(getCurrentReservationDateString());
  return prisma.reservation.create({
    data: {
      id: `${PREFIX}-res-${counter()}`,
      userId,
      carId,
      parkingSpotId: spotId,
      date: today,
      status,
    },
  });
}

export const createAuthedContext = (user: TestUser) => createContext(user);

export const unauthedContext = {
  context: {
    session: null,
    jobQueue: { send: async () => null },
  },
};
