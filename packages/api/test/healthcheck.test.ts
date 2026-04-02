import { describe, expect, test } from "bun:test";
import { call } from "@orpc/server";
import { appRouter } from "../src/routers/index";
import { unauthedContext } from "./helpers";

describe("appRouter health procedures", () => {
  test("healthCheck should return OK", async () => {
    const result = await call(appRouter.healthCheck, {}, unauthedContext);

    expect(result).toBe("OK");
  });

  test("dbCheck should query the database and return status", async () => {
    const result = await call(appRouter.dbCheck, {}, unauthedContext);

    expect(result.ok).toBe(true);
    expect(Number.isNaN(Date.parse(result.checkedAt))).toBe(false);
  });
});
