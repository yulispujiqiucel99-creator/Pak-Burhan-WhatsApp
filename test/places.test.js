const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parsePlaceCommand,
  getPlaceCategory,
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
