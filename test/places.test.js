const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getCommandIdentity,
  mergeCommands,
  sanitizeVisionReply,
  isRude,
  normalizeForToxic,
  formatQueueReply,
  reserveGroupRequest,
  parseImageCommand,
  getImageMessage,
  getSafeImageMimeType,
  validateVisionImage,
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
  getUpcomingScheduleDate,
  extractWhatsAppGroupInviteCode,
  getQuotedMessageId,
  parseScheduleActivationCommand,
  parseNaturalScheduleRequest,
  formatClassScheduleMessage,
  getClassScheduleAudioPath,
  formatClassScheduleDate,
  isClassScheduleDeliveryTime,
  normalizePlaceFeature,
  formatPlaceSummary,
  extractUrls,
  parseLinkCommand,
  getLinkQuestion,
  encodeVirusTotalUrlId,
  getVirusTotalStats,
  classifyVirusTotalResult,
  formatLinkSafetyResult,
  getAutoLinkCacheKey,
  formatAutomaticLinkWarning,
  isAutoLinkScanGroup,
  classifyAutomaticLinkResults,
  parseMusicCommand,
  formatMusicSelection,
  formatMusicTooLongMessage,
} = require("../index");

test("tidak menganggap pending sebagai link berbahaya otomatis", () => {
  assert.equal(classifyAutomaticLinkResults([{ status: "pending" }]), "pending");
  assert.equal(classifyAutomaticLinkResults([{ status: "error" }]), "pending");
  assert.equal(classifyAutomaticLinkResults([{ status: "clean" }]), "clean");
  assert.equal(classifyAutomaticLinkResults([{ status: "malicious" }]), "unsafe");
  assert.equal(classifyAutomaticLinkResults([{ status: "suspicious" }]), "unsafe");
  assert.equal(classifyAutomaticLinkResults([{ status: "clean" }, { status: "pending" }]), "pending");
  assert.equal(classifyAutomaticLinkResults([{ status: "clean" }, { status: "malicious" }]), "unsafe");
});

test("mem-parsing command musik dan membuat menu pilihan", () => {
  assert.deepEqual(parseMusicCommand("!musik relaxing piano"), { query: "relaxing piano", error: "" });
  assert.deepEqual(parseMusicCommand("!musik"), { query: "", error: "empty" });
  assert.equal(parseMusicCommand("musik relaxing"), null);
  const menu = formatMusicSelection([
    { name: "Musik A", artist: "Artis A" },
    { name: "Musik B", artist: "Artis B" },
  ]);
  assert.match(menu, /\[1\] Musik A — Artis A/);
  assert.match(menu, /\[2\] Musik B — Artis B/);
  assert.match(menu, /\[0\] BATALKAN/);
  assert.match(formatMusicTooLongMessage(), /musik melebihi batas \(5 menit\)/);
});

test("membaca link, command ceklink, dan hasil pemeriksaan keamanan", () => {
  assert.deepEqual(extractUrls("Baca https://example.com/artikel). dan https://example.org"), [
    "https://example.com/artikel",
    "https://example.org/",
  ]);
  assert.deepEqual(parseLinkCommand("!ceklink https://example.com/artikel"), {
    urls: ["https://example.com/artikel"],
    raw: "https://example.com/artikel",
  });
  assert.deepEqual(parseLinkCommand("!ceklink"), { error: "empty" });
  assert.equal(parseLinkCommand("!jadwal senin"), null);
  assert.equal(getLinkQuestion("!ceklink apa isi https://example.com/artikel", ["https://example.com/artikel"]), "apa isi");
  assert.equal(encodeVirusTotalUrlId("https://example.com"), "aHR0cHM6Ly9leGFtcGxlLmNvbQ");
  assert.deepEqual(getVirusTotalStats({ last_analysis_stats: { malicious: 2, suspicious: 1, harmless: 20, undetected: 3 } }), {
    malicious: 2,
    suspicious: 1,
    harmless: 20,
    undetected: 3,
  });
  assert.equal(classifyVirusTotalResult({ malicious: 1, suspicious: 0 }), "malicious");
  assert.equal(classifyVirusTotalResult({ malicious: 0, suspicious: 1 }), "suspicious");
  assert.equal(classifyVirusTotalResult({ malicious: 0, suspicious: 0 }), "clean");
  assert.match(formatLinkSafetyResult({ status: "malicious", stats: { malicious: 2 } }), /terdeteksi berbahaya/);
  assert.match(formatLinkSafetyResult({ status: "pending" }), /masih memeriksa/);
  assert.match(formatLinkSafetyResult({ status: "auth_error" }), /API key VirusTotal ditolak/);
  assert.match(formatLinkSafetyResult({ status: "rate_limited" }), /Batas VirusTotal/);
  assert.equal(getAutoLinkCacheKey("https://example.com/a#one"), "https://example.com/a");
  assert.equal(getAutoLinkCacheKey("https://example.com/a#two"), "https://example.com/a");
  assert.match(formatAutomaticLinkWarning([{ status: "malicious", stats: { malicious: 13 } }]), /13 deteksi/);
  assert.match(formatAutomaticLinkWarning([{ status: "suspicious", stats: { suspicious: 2 } }]), /2 indikator/);
  assert.equal(isAutoLinkScanGroup("123@g.us"), false);
});

test("tidak salah menandai pertanyaan sopan tentang Boyolali dan susu sebagai kasar", () => {
  assert.equal(isRude("Pak saya mau tanya kenapa Boyolali dijuluki kota susu?"), false);
  assert.equal(normalizeForToxic("kota susu"), "kota susu");
  assert.equal(isRude("dasar asu"), true);
});

test("membuat nomor antrean untuk permintaan grup yang masuk saat cooldown", async () => {
  assert.equal(formatQueueReply(2), "Permintaan sedang diproses (nomor antrean 2).");
  const first = reserveGroupRequest("queue-test@g.us");
  assert.equal(first.position, 1);
  assert.equal(first.shouldNotify, false);
  await first.waitForTurn();
  first.release();

  const next = reserveGroupRequest("queue-test@g.us");
  assert.equal(next.position, 1);
  assert.equal(next.shouldNotify, true);
  next.release();
});

test("mendeteksi reply langsung pada pesan gagal jadwal", () => {
  const reply = {
    message: {
      extendedTextMessage: {
        contextInfo: { stanzaId: "activation-failure-1" },
      },
    },
  };
  const ordinaryMessage = { message: { conversation: "bahas topik lain" } };
  assert.equal(getQuotedMessageId(reply), "activation-failure-1");
  assert.equal(getQuotedMessageId(ordinaryMessage), "");
});

test("membaca perintah aktivasi jadwal dari DM dan tautan grup", () => {
  const link = "https://chat.whatsapp.com/Kp4ULXH1ABh3OS2niLCe8P?s=sh";
  assert.equal(extractWhatsAppGroupInviteCode(link), "Kp4ULXH1ABh3OS2niLCe8P");
  assert.deepEqual(parseScheduleActivationCommand(`!aktifkan jadwal ${link}`), { inviteCode: "Kp4ULXH1ABh3OS2niLCe8P" });
  assert.deepEqual(parseScheduleActivationCommand(`!jadwal aktifkan ${link}`), { inviteCode: "Kp4ULXH1ABh3OS2niLCe8P" });
  assert.deepEqual(parseScheduleActivationCommand("!aktifkan jadwal"), { error: "missing_link" });
  assert.equal(parseScheduleActivationCommand("!jadwal senin"), null);
});

test("membuang reasoning internal dari hasil analisis gambar", () => {
  const withThink = "<think>Langkah internal yang tidak boleh tampil.</think>\n\nHalo Mas, jawaban akhirnya sudah benar. 📚";
  assert.equal(sanitizeVisionReply(withThink), "Halo Mas, jawaban akhirnya sudah benar. 📚");
  assert.equal(sanitizeVisionReply("Jawaban biasa tanpa reasoning."), "Jawaban biasa tanpa reasoning.");
  assert.equal(sanitizeVisionReply("<analysis>Catatan internal</analysis>Hasil akhir."), "Hasil akhir.");
});

test("menyatukan alias reset profil agar bantuan tidak duplikat", () => {
  assert.equal(getCommandIdentity("!profil ulang"), "profile-reset");
  assert.equal(getCommandIdentity("!reset profil"), "profile-reset");
  const commands = mergeCommands([
    { command: "!profil ulang", description: "Reset profil lama." },
    { command: "!reset profil", description: "Reset profil duplikat." },
  ]);
  assert.equal(commands.filter((item) => getCommandIdentity(item.command) === "profile-reset").length, 1);
});

test("mem-parsing perintah !gambar dan menolak perintah tanpa pertanyaan", () => {
  assert.deepEqual(parseImageCommand("!gambar tolong jelaskan soal ini"), { question: "tolong jelaskan soal ini" });
  assert.deepEqual(parseImageCommand("!gambar"), { error: "empty" });
  assert.equal(parseImageCommand("tolong lihat gambar"), null);
  assert.deepEqual(getImageMessage({ imageMessage: { mimetype: "image/jpeg" } }), { mimetype: "image/jpeg" });
});

test("memvalidasi gambar vision berdasarkan tipe dan ukuran", () => {
  const image = Buffer.from([1, 2, 3]);
  assert.deepEqual(validateVisionImage(image, { mimetype: "image/jpeg" }), { mimeType: "image/jpeg" });
  assert.deepEqual(validateVisionImage(image, { mimetype: "application/pdf" }), { error: "unsupported_type" });
  assert.equal(getSafeImageMimeType({ mimetype: "image/png" }), "image/png");
  assert.equal(getSafeImageMimeType({ mimetype: "image/gif" }), null);
  assert.deepEqual(validateVisionImage(Buffer.alloc(20 * 1024 * 1024 + 1), { mimetype: "image/jpeg" }), { error: "too_large" });
});

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

test("membuat satu pesan informasi Senin berisi seragam, pelajaran, dan dua piket", () => {
  const date = new Date("2026-08-10T10:00:00.000Z");
  const message = formatClassScheduleMessage("senin", date);
  assert.equal(formatClassScheduleDate(date), "10 Agustus 2026, senin");
  assert.match(message, /\*INFORMASI SENIN\*/);
  assert.match(message, /_10 Agustus 2026, senin_/);
  assert.match(message, /👔 Seragam\nmemakai seragam sekolah lama/);
  assert.match(message, /📔 Jadwal\n- Upacara\n- Matematika/);
  assert.match(message, /- PAI dan BP/);
  assert.match(message, /🛋️ Piket kelas\n\*SENIN\*\n- Farida\n- Rara/);
  assert.match(message, /🍴 Piket MBG\n\*SENIN\*\n- Farida\n- Nayla\n- Lulu\n- Satria\n- Alby\n- Amanda/);
  assert.match(message, /\*JIKA TERDAPAT KESALAHAN PADA JADWAL HUBUNGIN NOMOR DARURAT\*🗿😅\*$/);
});

test("menampilkan pesan libur pada Sabtu dan Minggu", () => {
  assert.match(formatClassScheduleMessage("sabtu"), /Hari ini libur/);
  assert.match(formatClassScheduleMessage("minggu"), /Hari ini libur/);
});

test("menemukan audio jadwal untuk setiap hari sekolah", () => {
  for (const dayKey of ["senin", "selasa", "rabu", "kamis", "jumat"]) {
    assert.match(getClassScheduleAudioPath(dayKey), new RegExp(`${dayKey}\\.ogg$`));
  }
  assert.equal(getClassScheduleAudioPath("sabtu"), null);
});

test("membaca hari jadwal dan hanya mengirim pada pukul 17.00 atau 20.00 WIB", () => {
  assert.equal(parseClassScheduleDay("!jadwal kamis"), "kamis");
  assert.equal(parseClassScheduleDay("!jadwal ahad"), "minggu");
  assert.equal(getClassScheduleDayKey(new Date("2026-08-17T10:00:00.000Z")), "senin");
  assert.equal(isClassScheduleDeliveryTime(new Date("2026-08-17T10:00:00.000Z")), true);
  assert.equal(isClassScheduleDeliveryTime(new Date("2026-08-17T13:00:00.000Z")), true);
  assert.equal(isClassScheduleDeliveryTime(new Date("2026-08-17T11:00:00.000Z")), false);
});

test("memahami pertanyaan jadwal natural untuk hari ini, besok, dan nama hari", () => {
  const fridayWib = new Date("2026-08-14T10:00:00.000Z");
  const tomorrow = parseNaturalScheduleRequest("Pak, jadwal besok apa?", fridayWib);
  assert.equal(tomorrow.dayKey, "sabtu");
  assert.equal(tomorrow.reference, "besok");
  assert.equal(formatClassScheduleDate(tomorrow.targetDate), "15 Agustus 2026, sabtu");

  const monday = parseNaturalScheduleRequest("Pelajaran Senin apa, Pak?", fridayWib);
  assert.equal(monday.dayKey, "senin");
  assert.equal(formatClassScheduleDate(monday.targetDate), "17 Agustus 2026, senin");
  assert.equal(getUpcomingScheduleDate("senin", fridayWib).toISOString(), monday.targetDate.toISOString());

  const today = parseNaturalScheduleRequest("Pak, piket hari ini siapa?", fridayWib);
  assert.equal(today.dayKey, "jumat");
  assert.equal(parseNaturalScheduleRequest("Pak, kamu baik?", fridayWib), null);
});
