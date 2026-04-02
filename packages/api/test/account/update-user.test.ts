import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import prisma, { UserRole } from "@hitachi2/db";
import { call } from "@orpc/server";
import { appRouter } from "../../src/routers/index";
import { createContext } from "../helpers";

const SECRETARY = {
  id: "test-update-user-secretary",
  name: "Secretary User",
  email: "test-update-secretary@test.com",
  emailVerified: true,
  role: UserRole.SECRETARY,
};

const EMPLOYEE = {
  id: "test-update-user-employee",
  name: "Employee To Update",
  email: "test-update-employee@test.com",
  emailVerified: true,
  role: UserRole.EMPLOYEE,
};

const MANAGER = {
  id: "test-update-user-manager",
  name: "Manager User",
  email: "test-update-manager@test.com",
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

  test("should update both name and role for manager", async () => {
    const result = await call(
      appRouter.updateUser,
      { userId: EMPLOYEE.id, name: "Double Update", role: UserRole.SECRETARY },
      managerCtx,
    );

    expect(result.name).toBe("Double Update");
    expect(result.role).toBe(UserRole.SECRETARY);
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
