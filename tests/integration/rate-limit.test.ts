import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@/db";
import { getIpHashSecret } from "@/lib/auth/secrets";
import {
  clearLoginFailures,
  getLoginBlock,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";
import { hashIp } from "@/lib/auth/ip";

const attemptId = hashIp(randomUUID(), getIpHashSecret());

describe("database login rate limit", () => {
  beforeAll(async () => {
    await clearLoginFailures(attemptId);
  });

  afterAll(async () => {
    await clearLoginFailures(attemptId);
    await pool.end();
  });

  it("records concurrent failures and blocks after five attempts", async () => {
    const counts = await Promise.all(
      Array.from({ length: 5 }, () => recordLoginFailure(attemptId)),
    );

    expect(counts.sort((left, right) => left - right)).toEqual([1, 2, 3, 4, 5]);
    expect(await getLoginBlock(attemptId)).toBeInstanceOf(Date);
  });
});
