import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import prisma, { UserRole } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import {
  cleanupUsers,
  createAuthedContext,
  createEmployee,
  createManager,
  createSecretary,
  seedUsers,
} from "../helpers";

const SECRETARY = createSecretary({ id: "test-secretary-user" });
const EMPLOYEE = createEmployee({ id: "test-employee-user" });
const MANAGER = createManager({ id: "test-manager-user" });

const secretaryCtx = createAuthedContext(SECRETARY);
const employeeCtx = createAuthedContext(EMPLOYEE);
const managerCtx = createAuthedContext(MANAGER);

beforeAll(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: [SECRETARY.id, EMPLOYEE.id, MANAGER.id] } },
  });
  await seedUsers(SECRETARY, EMPLOYEE, MANAGER);
});

afterAll(async () => {
  await cleanupUsers(SECRETARY, EMPLOYEE, MANAGER);
});

describe("account router - getAllUsers", () => {
  test("should return all users for secretary", async () => {
    const result = await call(appRouter.getAllUsers, undefined, secretaryCtx);

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThanOrEqual(3);
    const secretary = result.find((u) => u.id === SECRETARY.id);
    expect(secretary).toBeDefined();
    if (!secretary) return;
    expect(secretary.name).toBe(SECRETARY.name);
    expect(secretary.email).toBe(SECRETARY.email);
    expect(secretary.role).toBe(UserRole.SECRETARY);
  });

  test("should throw FORBIDDEN for manager", async () => {
    expect(call(appRouter.getAllUsers, undefined, managerCtx)).rejects.toThrow("Access denied");
  });

  test("should return all users with carCount and reservationCount", async () => {
    const result = await call(appRouter.getAllUsers, undefined, secretaryCtx);

    const secretary = result.find((u) => u.id === SECRETARY.id);
    expect(secretary).toBeDefined();
    if (!secretary) return;
    expect(typeof secretary.carCount).toBe("number");
    expect(typeof secretary.reservationCount).toBe("number");
  });

  test("should throw FORBIDDEN for employee", async () => {
    expect(call(appRouter.getAllUsers, undefined, employeeCtx)).rejects.toThrow("Access denied");
  });
});
