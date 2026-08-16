const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const {
  parseStickerCommand,
  getImageMessage,
  getQuotedImageMessage,
  getStickerImageSource,
  getSafeStickerMimeType,
  validateStickerImage,
  renderImageSticker,
} = require("../index");

function assertWebp(buffer) {
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 16);
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
}

test("test cepat: hanya command sticker gambar yang dikenali", () => {
  assert.deepEqual(parseStickerCommand("!stiker"), { mode: "image" });
  assert.deepEqual(parseStickerCommand("!sticker"), { mode: "image" });
  assert.deepEqual(parseStickerCommand("! stiker"), { mode: "image" });
  assert.equal(parseStickerCommand("!stiker CIHUY"), null);
  assert.equal(parseStickerCommand("!brat apasihhh"), null);
  assert.equal(parseStickerCommand("!iqc yang ytta aja"), null);
});

test("test cepat: validasi media menolak input tidak aman", () => {
  assert.equal(getSafeStickerMimeType({ mimetype: "image/jpeg" }), "image/jpeg");
  assert.equal(getSafeStickerMimeType({ mimetype: "image/png" }), "image/png");
  assert.equal(getSafeStickerMimeType({ mimetype: "video/mp4" }), null);
  assert.equal(validateStickerImage(Buffer.from("ok"), { mimetype: "image/png" }).error, undefined);
  assert.equal(validateStickerImage(Buffer.alloc(10 * 1024 * 1024 + 1), { mimetype: "image/png" }).error, "too_large");
});

test("test cepat: gambar langsung dan quoted image ditemukan", () => {
  const imageMessage = { mimetype: "image/jpeg", fileLength: "10" };
  const direct = getStickerImageSource({ message: { imageMessage } }, { imageMessage });
  assert.equal(getImageMessage({ imageMessage }), imageMessage);
  assert.equal(direct.message, imageMessage);

  const quotedImage = { mimetype: "image/png", fileLength: "10" };
  const reply = {
    key: { remoteJid: "123@g.us" },
    message: {
      extendedTextMessage: {
        contextInfo: { stanzaId: "quoted-1", quotedMessage: { imageMessage: quotedImage } },
      },
    },
  };
  assert.ok(getQuotedImageMessage(reply));
  assert.equal(getStickerImageSource(reply, { extendedTextMessage: {} }).message, quotedImage);
});

test("test cepat: renderer menghasilkan WebP sticker gambar tanpa overlay teks", async () => {
  const source = await sharp({
    create: { width: 80, height: 40, channels: 4, background: { r: 120, g: 80, b: 220, alpha: 1 } },
  }).png().toBuffer();
  const imageSticker = await renderImageSticker(source);
  assertWebp(imageSticker);
});

console.log("Test cepat sticker selesai: hanya konversi gambar, tanpa Brat/IQC, tanpa API eksternal.");
