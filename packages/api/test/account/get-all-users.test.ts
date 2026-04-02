import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import prisma, { UserRole } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import { createContext } from "../helpers";

const SECRETARY = {
  id: "test-secretary-user",
  name: "Secretary User",
  email: "test-secretary@test.com",
  emailVerified: true,
  role: UserRole.SECRETARY,
};

const EMPLOYEE = {
  id: "test-employee-user",
  name: "Employee User",
  email: "test-employee@test.com",
  emailVerified: true,
  role: UserRole.EMPLOYEE,
};

const MANAGER = {
  id: "test-manager-user",
  name: "Manager User",
  email: "test-manager@test.com",
  emailVerified: true,
  role: UserRole.MANAGER,
};

const secretaryCtx = createContext(SECRETARY);
const employeeCtx = createContext(EMPLOYEE);
const managerCtx = createContext(MANAGER);

beforeAll(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: [SECRETARY.id, EMPLOYEE.id, MANAGER.id] } },
  });
  await prisma.user.createMany({
    data: [SECRETARY, EMPLOYEE, MANAGER],
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: [SECRETARY.id, EMPLOYEE.id, MANAGER.id] } },
  });
});

describe("account router - getAllUsers", () => {
  test("should return all users for secretary", async () => {
    const result = await call(appRouter.getAllUsers, undefined, secretaryCtx);

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThanOrEqual(3);
    const secretary = result.find((u) => u.id === SECRETARY.id);
    expect(secretary).toBeDefined();
    expect(secretary?.name).toBe(SECRETARY.name);
    expect(secretary?.email).toBe(SECRETARY.email);
    expect(secretary?.role).toBe(UserRole.SECRETARY);
  });

  test("should return all users for manager", async () => {
    const result = await call(appRouter.getAllUsers, undefined, managerCtx);

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  test("should return all users with carCount and reservationCount", async () => {
    const result = await call(appRouter.getAllUsers, undefined, secretaryCtx);

    const secretary = result.find((u) => u.id === SECRETARY.id);
    expect(secretary).toBeDefined();
    expect(typeof secretary?.carCount).toBe("number");
    expect(typeof secretary?.reservationCount).toBe("number");
  });

  test("should throw FORBIDDEN for employee", async () => {
    expect(call(appRouter.getAllUsers, undefined, employeeCtx)).rejects.toThrow("Access denied");
  });
});
