const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {
  parseClassScheduleDay,
  formatClassScheduleMessage,
  getClassScheduleAudioPath,
  getNextClassScheduleTarget,
  sendClassScheduleContent,
  WEEKEND_AUDIO_DELIVERY_MINUTES,
  isClassScheduleDeliveryTime,
  parseIndonesianDate,
  getOfficialHolidayDate,
  formatHolidayMessage,
  HOLIDAY_NOTIFICATION_MINUTES,
} = require("../index");

const WEEKEND_DAYS = ["sabtu", "minggu"];

test("test cepat: audio hari libur dijadwalkan pukul 07.00 WIB", () => {
  assert.equal(WEEKEND_AUDIO_DELIVERY_MINUTES, 7 * 60);
  assert.equal(isClassScheduleDeliveryTime(new Date("2026-08-16T00:00:00.000Z")), false);
});

test("test cepat: jadwal sekolah tetap pada pukul 17.00 dan 20.00 WIB", () => {
  assert.equal(isClassScheduleDeliveryTime(new Date("2026-08-16T10:00:00.000Z")), true);
  assert.equal(isClassScheduleDeliveryTime(new Date("2026-08-16T13:00:00.000Z")), true);
});

test("test cepat: scheduler memilih hari berikutnya dan akhir pekan menuju Senin", () => {
  const friday = getNextClassScheduleTarget(new Date("2026-08-14T10:00:00.000Z"));
  const saturday = getNextClassScheduleTarget(new Date("2026-08-15T10:00:00.000Z"));
  const sunday = getNextClassScheduleTarget(new Date("2026-08-16T10:00:00.000Z"));
  const monday = getNextClassScheduleTarget(new Date("2026-08-17T10:00:00.000Z"));
  assert.equal(friday.dayKey, "sabtu");
  assert.equal(saturday.dayKey, "senin");
  assert.equal(sunday.dayKey, "senin");
  assert.equal(monday.dayKey, "selasa");
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

test("test cepat: tanggal Idulfitri hanya dikonfirmasi dari dua sumber resmi", () => {
  assert.equal(parseIndonesianDate("Idulfitri jatuh pada 10 Maret 2027")?.toISOString(), "2027-03-10T00:00:00.000Z");
  const confirmed = getOfficialHolidayDate("idulfitri", [
    { title: "Jadwal Idulfitri 2027", content: "Idulfitri 10 Maret 2027", url: "https://kemenag.go.id/berita/kalender" },
    { title: "Pemerintah menetapkan Idulfitri", content: "Idul Fitri 10 Maret 2027", url: "https://kemenkopmk.go.id/artikel/libur" },
  ]);
  assert.equal(confirmed?.dateKey, "2027-03-10");
  assert.equal(getOfficialHolidayDate("idulfitri", [
    { title: "Idulfitri 10 Maret 2027", content: "", url: "https://kemenag.go.id/a" },
  ]), null);
});

test("test cepat: pesan H-1 menyebut hari raya dan jadwal libur", () => {
  assert.equal(HOLIDAY_NOTIFICATION_MINUTES, 8 * 60 + 10);
  const message = formatHolidayMessage({ label: "Idulfitri", dateKey: "2027-03-10" }, new Date("2027-03-10T00:00:00.000Z"), "PENGINGAT H-1 IDULFITRI");
  assert.match(message, /PENGINGAT H-1 IDULFITRI/);
  assert.match(message, /Idulfitri/);
  assert.match(message, /tidak ada jadwal pelajaran/);
});

console.log("Test cepat jadwal selesai: tanpa WhatsApp, Supabase, Gemini, VirusTotal, atau Jina.");
