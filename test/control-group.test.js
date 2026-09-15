const test = require("node:test");
const assert = require("node:assert/strict");

process.env.CONTROL_GROUP_JID = "120363999999999999@g.us";
const { normalizeControlGroupJid, isControlGroup, hasAdminAccess } = require("../index");

test("ID numerik dinormalisasi menjadi JID grup tanpa menerima tautan undangan", () => {
  assert.equal(normalizeControlGroupJid("120363999999999999"), "120363999999999999@g.us");
  assert.equal(normalizeControlGroupJid("120363999999999999@g.us"), "120363999999999999@g.us");
  assert.equal(normalizeControlGroupJid("https://chat.whatsapp.com/example"), "https://chat.whatsapp.com/example");
});

test("Grup Kontrol dikenali berdasarkan JID percakapan", () => {
  assert.equal(isControlGroup("120363999999999999@g.us"), true);
  assert.equal(isControlGroup("120363999999999998@g.us"), false);
  assert.equal(isControlGroup("628895683942@s.whatsapp.net"), false);
});

test("akses admin tidak bocor ke grup umum atau chat pribadi", () => {
  assert.equal(hasAdminAccess({ jid: "120363999999999999@g.us", isGroup: true }), true);
  assert.equal(hasAdminAccess({ jid: "120363999999999998@g.us", isGroup: true }), false);
  assert.equal(hasAdminAccess({ jid: "628895683942@s.whatsapp.net", isGroup: false }), false);
  assert.equal(hasAdminAccess({ jid: "120363999999999999@g.us", isGroup: false }), false);
});
