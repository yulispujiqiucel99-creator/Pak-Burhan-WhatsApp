const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parsePlaceCommand,
  getPlaceCategory,
  isLowValueMessage,
  buildLowValueReply,
  consumeQuestionQuotaForStore,
  getQuestionQuotaStatusForStore,
  buildQuestionLimitReply,
  buildQuotaStatusReply,
  buildAdminStatusReply,
  isGroupRestTime,
  getClassScheduleDayKey,
  parseClassScheduleDay,
  formatClassScheduleMessage,
  isClassScheduleDeliveryTime,
  normalizePlaceFeature,
  formatPlaceSummary,
} = require("../index");

test("mem-parsing perintah !tempat dengan lokasi", () => {
  assert.deepEqual(parsePlaceCommand("!tempat kafe di Solo Square"), {
    rawQuery: "kafe di Solo Square",
    searchTerm: "kafe",
    location: "Solo Square",
  });
});

test("memberi petunjuk ketika !tempat tanpa kata kunci", () => {
  assert.deepEqual(parsePlaceCommand("!tempat"), { error: "empty" });
});

test("membedakan pesan biasa dari perintah tempat", () => {
  assert.equal(parsePlaceCommand("cari kafe di Solo"), null);
});

test("memetakan jenis tempat umum ke kategori Geoapify", () => {
  assert.equal(getPlaceCategory("bioskop"), "entertainment.cinema");
  assert.equal(getPlaceCategory("rumah sakit"), "healthcare.hospital");
  assert.equal(getPlaceCategory("kafe"), "catering.cafe");
  assert.equal(getPlaceCategory("Solo Square"), null);
});

test("menormalkan hasil Geoapify menjadi data lokasi WhatsApp yang valid", () => {
  const place = normalizePlaceFeature({
    properties: {
      name: "Solo Square",
      formatted: "Solo Square, Jalan Slamet Riyadi, Surakarta, Indonesia",
      lat: -7.561019,
      lon: 110.78845,
      distance: 1250.4,
    },
  });

  assert.deepEqual(place, {
    name: "Solo Square",
    address: "Solo Square, Jalan Slamet Riyadi, Surakarta, Indonesia",
    latitude: -7.561019,
    longitude: 110.78845,
    distanceMeters: 1250,
  });
  assert.match(formatPlaceSummary(place, 0), /Solo Square \(1\.3 km\)/);
});

test("menolak hasil tanpa koordinat agar tidak mengirim lokasi rusak", () => {
  assert.equal(normalizePlaceFeature({ properties: { name: "Tanpa koordinat" } }), null);
});

test("mendeteksi basa-basi dan pesan ringan tanpa mengirimnya ke AI", () => {
  for (const message of ["halo", "Hai Pak Burhan!", "wkwkwk 😂", "makasih", "tes bot", "selamat malam"]) {
    assert.equal(isLowValueMessage(message), true, message);
  }
  assert.equal(isLowValueMessage("jelaskan fotosintesis"), false);
  assert.equal(isLowValueMessage("!tempat bioskop di Solo"), false);
  assert.equal(isLowValueMessage("tolong cari berita terbaru"), false);
});

test("membuat balasan hemat-limit dengan panggilan sesuai gender", () => {
  assert.equal(
    buildLowValueReply({ gender: "male" }),
    "hehe maaf ya Mas, sebelumnya saya dibuat dengan limit. *jika limit saya habis* karna hal yang tidak terlalu berguna itu sama saja mubazir limit😅"
  );
  assert.match(buildLowValueReply({ gender: "female" }), /^hehe maaf ya Mbak,/);
});

test("membatasi satu LID sampai 20 pertanyaan lalu mereset setelah 24 jam", () => {
  const usage = {};
  const lid = "235656601194672";
  const start = 1_700_000_000_000;

  for (let index = 0; index < 20; index += 1) {
    assert.equal(consumeQuestionQuotaForStore(usage, lid, start + index), true);
  }
  assert.equal(consumeQuestionQuotaForStore(usage, lid, start + 100), false);
  assert.equal(usage[lid].count, 20);
  assert.equal(consumeQuestionQuotaForStore(usage, lid, start + 24 * 60 * 60 * 1000), true);
  assert.equal(usage[lid].count, 1);
});

test("membuat pesan limit sesuai panggilan profil", () => {
  assert.equal(
    buildQuestionLimitReply({ gender: "male" }),
    "waduh mas udh limit nih tunggu sampai 24jam ya saya juga mau istirahat"
  );
  assert.equal(
    buildQuestionLimitReply({ gender: "female" }),
    "waduh mbak udh limit nih tunggu sampai 24jam ya saya juga mau istirahat"
  );
});

test("menutup respons grup pada 21.30 sampai sebelum 04.00 WIB", () => {
  assert.equal(isGroupRestTime(new Date("2026-08-14T14:29:00.000Z")), false);
  assert.equal(isGroupRestTime(new Date("2026-08-14T14:30:00.000Z")), true);
  assert.equal(isGroupRestTime(new Date("2026-08-14T20:59:00.000Z")), true);
  assert.equal(isGroupRestTime(new Date("2026-08-14T21:00:00.000Z")), false);
});

test("menampilkan sisa kuota dan waktu reset tanpa mengubah pemakaian", () => {
  const usage = {
    "235656601194672": { windowStartedAt: 1_700_000_000_000, count: 7 },
  };
  const now = 1_700_000_100_000;
  const quota = getQuestionQuotaStatusForStore(usage, "235656601194672", now);
  assert.deepEqual(quota, {
    used: 7,
    remaining: 13,
    resetAt: new Date(1_700_086_400_000),
  });
  assert.equal(usage["235656601194672"].count, 7);
});

test("membuat teks !sisa dan !status tanpa mengekspos API key", () => {
  const quotaText = buildQuotaStatusReply(
    { name: "Naufal", gender: "male" },
    "belum-pernah-mengirim-pertanyaan",
    1_700_000_000_000
  );
  assert.match(quotaText, /Sisa pertanyaan: 20/);
  assert.match(quotaText, /Mas Naufal/);

  const statusText = buildAdminStatusReply("belum-pernah-mengirim-pertanyaan", 1_700_000_000_000);
  assert.match(statusText, /Status Pak Burhan/);
  assert.match(statusText, /Model Groq:/);
  assert.doesNotMatch(statusText, /gsk_|sk-/i);
});

test("membuat satu pesan jadwal Senin berisi pelajaran dan dua piket", () => {
  const message = formatClassScheduleMessage("senin");
  assert.match(message, /Jadwal Kelas VII D — Senin/);
  assert.match(message, /1\. Upacara/);
  assert.match(message, /2\. Matematika/);
  assert.match(message, /PAI dan BP/);
  assert.match(message, /Piket kelas: Farida, Rara, Nayla, Loveya, Lulu, Satria, Kenzie/);
  assert.match(message, /Piket MBG: Farida, Nayla, Lulu, Satria, Alby, Amanda/);
});

test("menampilkan pesan libur pada Sabtu dan Minggu", () => {
  assert.match(formatClassScheduleMessage("sabtu"), /Hari ini libur/);
  assert.match(formatClassScheduleMessage("minggu"), /Hari ini libur/);
});

test("membaca hari jadwal dan hanya mengirim pada pukul 17.00 atau 20.00 WIB", () => {
  assert.equal(parseClassScheduleDay("!jadwal kamis"), "kamis");
  assert.equal(parseClassScheduleDay("!jadwal ahad"), "minggu");
  assert.equal(getClassScheduleDayKey(new Date("2026-08-17T10:00:00.000Z")), "senin");
  assert.equal(isClassScheduleDeliveryTime(new Date("2026-08-17T10:00:00.000Z")), true);
  assert.equal(isClassScheduleDeliveryTime(new Date("2026-08-17T13:00:00.000Z")), true);
  assert.equal(isClassScheduleDeliveryTime(new Date("2026-08-17T11:00:00.000Z")), false);
});
