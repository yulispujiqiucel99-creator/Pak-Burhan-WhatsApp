const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeJidNumber,
  buildPrivateIntroText,
  isValidPrivateCodeInput,
} = require("../index");

test("normalisasi identitas privat menerima LID Baileys", () => {
  assert.equal(normalizeJidNumber("235656601194672@lid"), "235656601194672");
  assert.equal(normalizeJidNumber("235656601194672:1@lid"), "235656601194672");
  assert.equal(normalizeJidNumber("628895683942@s.whatsapp.net"), "628895683942");
});

test("kode private access harus tujuh karakter alfanumerik", () => {
  assert.equal(isValidPrivateCodeInput("A1B2C3D"), true);
  assert.equal(isValidPrivateCodeInput("a1b2c3d"), true);
  assert.equal(isValidPrivateCodeInput("123456"), false);
  assert.equal(isValidPrivateCodeInput("ABC-123"), false);
});

test("intro privat memakai #JFR dan tidak memiliki command mulai", () => {
  const intro = buildPrivateIntroText();
  assert.match(intro, /#JFR/);
  assert.match(intro, /minta|meminta admin/i);
  assert.doesNotMatch(intro, /!mulai|\/start|command mulai/i);
});
