const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {
  parseClassScheduleDay,
  formatClassScheduleMessage,
  getClassScheduleAudioPath,
  sendClassScheduleContent,
  WEEKEND_AUDIO_DELIVERY_MINUTES,
  isClassScheduleDeliveryTime,
} = require("../index");

const WEEKEND_DAYS = ["sabtu", "minggu"];

 test("test cepat: audio hari libur dijadwalkan pukul 08.10 WIB", () => {
  assert.equal(WEEKEND_AUDIO_DELIVERY_MINUTES, 8 * 60 + 10);
  assert.equal(isClassScheduleDeliveryTime(new Date("2026-08-16T01:10:00.000Z")), false);
});

test("test cepat: jadwal sekolah tetap pada pukul 17.00 dan 20.00 WIB", () => {
  assert.equal(isClassScheduleDeliveryTime(new Date("2026-08-16T10:00:00.000Z")), true);
  assert.equal(isClassScheduleDeliveryTime(new Date("2026-08-16T13:00:00.000Z")), true);
});

test("test cepat: command Sabtu dan Minggu dikenali", () => {
  assert.equal(parseClassScheduleDay("!jadwal sabtu"), "sabtu");
  assert.equal(parseClassScheduleDay("!jadwal minggu"), "minggu");
});

test("test cepat: teks Sabtu dan Minggu adalah informasi libur", () => {
  for (const dayKey of WEEKEND_DAYS) {
    const message = formatClassScheduleMessage(dayKey, new Date("2026-08-15T00:00:00.000Z"));
    assert.match(message, new RegExp(`\\*INFORMASI ${dayKey.toUpperCase()}\\*`));
    assert.match(message, /Hari ini libur/);
    assert.match(message, /JIKA TERDAPAT KESALAHAN/);
  }
});

test("test cepat: file audio Ogg tersedia untuk Sabtu dan Minggu", () => {
  for (const dayKey of WEEKEND_DAYS) {
    const audioPath = getClassScheduleAudioPath(dayKey);
    assert.ok(audioPath, `audio ${dayKey} tidak ditemukan`);
    assert.ok(fs.statSync(audioPath).size > 0, `audio ${dayKey} kosong`);
    assert.match(audioPath, new RegExp(`${dayKey}\\.ogg$`));
  }
});

test("test cepat: handler mengirim voice note lalu teks untuk akhir pekan", async () => {
  const sent = [];
  const fakeSock = {
    async sendMessage(jid, content, options) {
      sent.push({ jid, content, options });
      return { key: { id: `test-${sent.length}` } };
    },
  };

  await sendClassScheduleContent(fakeSock, "test@g.us", "minggu", new Date("2026-08-16T00:00:00.000Z"), {
    includeAudio: true,
  });

  assert.equal(sent.length, 2);
  assert.ok(Buffer.isBuffer(sent[0].content.audio));
  assert.equal(sent[0].content.ptt, true);
  assert.equal(sent[0].content.mimetype, "audio/ogg; codecs=opus");
  assert.match(sent[1].content.text, /\\*INFORMASI MINGGU\\*/);
  assert.match(sent[1].content.text, /Hari ini libur/);
});

console.log("Test cepat jadwal selesai: tanpa WhatsApp, Supabase, Groq, VirusTotal, atau Jina.");
