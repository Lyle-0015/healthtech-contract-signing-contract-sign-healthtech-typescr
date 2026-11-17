import assert from "node:assert/strict";
import test from "node:test";
import { notificationFor } from "./contract-sign-healthtech.ts";

test("a signed appointment produces a patient-safe review message", () => {
  assert.equal(notificationFor("signed"), "The appointment contract is signed and ready for review.");
  assert.notEqual(notificationFor("signed"), notificationFor("pending"));
});
