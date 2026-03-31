import { beforeEach, describe, expect, mock, test } from "bun:test";
import { call } from "@orpc/server";

let dbCheckCalls = 0;

mock.module("@hitachi2/db", () => ({
  default: {
    $queryRaw: async () => {
      dbCheckCalls += 1;
      return [{ ok: 1 }];
    },
  },
}));

const { appRouter } = await import("../src/routers/index");

const context = {
  context: {
    session: null,
    jobQueue: { send: async () => null },
  },
};

describe("appRouter health procedures", () => {
  beforeEach(() => {
    dbCheckCalls = 0;
  });

  test("healthCheck should return OK", async () => {
    const result = await call(appRouter.healthCheck, {}, context);

    expect(result).toBe("OK");
  });

  test("dbCheck should query the database and return status", async () => {
    const result = await call(appRouter.dbCheck, {}, context);

    expect(dbCheckCalls).toBe(1);
    expect(result.ok).toBe(true);
    expect(Number.isNaN(Date.parse(result.checkedAt))).toBe(false);
  });
});
