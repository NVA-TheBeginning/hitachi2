import { describe, expect, test } from "bun:test";
import { call } from "@orpc/server";
import { appRouter } from "../src/routers/index";

describe("healthCheck procedure", () => {
  test("should return OK", async () => {
    const result = await call(
      appRouter.healthCheck,
      {},
      { context: { session: null, jobQueue: { send: async () => null } } },
    );

    expect(result).toBe("OK");
  });
});
