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

const SECRETARY = createSecretary({ id: "test-update-user-secretary" });
const EMPLOYEE = createEmployee({ id: "test-update-user-employee", name: "Employee To Update" });
const MANAGER = createManager({ id: "test-update-user-manager" });

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

describe("account router - updateUser", () => {
  test("should update user name for secretary", async () => {
    const result = await call(appRouter.updateUser, { userId: EMPLOYEE.id, name: "Updated Name" }, secretaryCtx);

    expect(result.name).toBe("Updated Name");
    expect(result.id).toBe(EMPLOYEE.id);
  });

  test("should update user role for secretary", async () => {
    const result = await call(appRouter.updateUser, { userId: EMPLOYEE.id, role: UserRole.MANAGER }, secretaryCtx);

    expect(result.role).toBe(UserRole.MANAGER);
  });

  test("should throw FORBIDDEN for manager", async () => {
    expect(
      call(appRouter.updateUser, { userId: EMPLOYEE.id, name: "Double Update", role: UserRole.SECRETARY }, managerCtx),
    ).rejects.toThrow("Access denied");
  });

  test("should throw FORBIDDEN for employee", async () => {
    expect(call(appRouter.updateUser, { userId: EMPLOYEE.id, name: "Hacked Name" }, employeeCtx)).rejects.toThrow(
      "Access denied",
    );
  });

  test("should return updated user with account details", async () => {
    const result = await call(appRouter.updateUser, { userId: EMPLOYEE.id, name: "Final Name" }, secretaryCtx);

    expect(result.email).toBe(EMPLOYEE.email);
    expect(result.cars).toBeDefined();
    expect(result.reservationQuota).toBeDefined();
  });
});
