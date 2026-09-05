const test = require("node:test");
const assert = require("node:assert/strict");
const {
  encryptPayload,
  decryptPayload,
} = require("../lib/supabase-session-backup");

test("session backup mengenkripsi payload dan dapat didekripsi kembali", () => {
  const payload = {
    files: [
      { name: "creds.json", data: Buffer.from('{"registered":true}').toString("base64") },
      { name: "app-state-sync-key-1.json", data: Buffer.from("secret-key").toString("base64") },
    ],
  };
  const encrypted = encryptPayload(payload, "test-encryption-key");
  assert.notEqual(encrypted.toString("utf8").includes("secret-key"), true);
  assert.deepEqual(decryptPayload(encrypted, "test-encryption-key"), payload);
});

test("session backup menolak kunci dekripsi yang salah", () => {
  const encrypted = encryptPayload({ files: [] }, "correct-key");
  assert.throws(() => decryptPayload(encrypted, "wrong-key"));
});
