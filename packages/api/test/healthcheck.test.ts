import { describe, expect, test } from "bun:test";
import { call } from "@orpc/server";
import { appRouter } from "../src/routers/index";

const context = {
  context: {
    session: null,
    jobQueue: { send: async () => null },
  },
};

describe("appRouter health procedures", () => {
  test("healthCheck should return OK", async () => {
    const result = await call(appRouter.healthCheck, {}, context);

    expect(result).toBe("OK");
  });

  test("dbCheck should query the database and return status", async () => {
    const result = await call(appRouter.dbCheck, {}, context);

    expect(result.ok).toBe(true);
    expect(Number.isNaN(Date.parse(result.checkedAt))).toBe(false);
  });
});
