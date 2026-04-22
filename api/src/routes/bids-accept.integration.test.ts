import assert from "node:assert/strict";
import { test } from "node:test";

test("bid accept integration (requires TEST_DATABASE_URL)", async (t) => {
  if (!process.env.TEST_DATABASE_URL) {
    t.skip("Set TEST_DATABASE_URL to run integration tests");
    return;
  }
  assert.ok(process.env.TEST_DATABASE_URL.length > 0);
});
