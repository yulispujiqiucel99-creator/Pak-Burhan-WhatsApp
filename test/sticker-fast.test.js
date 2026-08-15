const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const {
  parseStickerCommand,
  parseTextStickerCommand,
  getStickerImageSource,
  getSafeStickerMimeType,
  validateStickerImage,
  validateStickerText,
  renderImageSticker,
  renderTextSticker,
} = require("../index");

function assertWebp(buffer) {
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 16);
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
}

test("test cepat: parser menerima command sticker gambar dan teks", () => {
  assert.deepEqual(parseStickerCommand("!stiker"), { mode: "image" });
  assert.deepEqual(parseStickerCommand("!sticker"), { mode: "image" });
  assert.deepEqual(parseTextStickerCommand("!brat apasihhh 😒"), {
    style: "brat",
    text: "apasihhh 😒",
    error: null,
  });
  assert.deepEqual(parseTextStickerCommand("!iqc yang ytta aja"), {
    style: "iqc",
    text: "yang ytta aja",
    error: null,
  });
  assert.equal(parseTextStickerCommand("!brat").error, "empty");
});

test("test cepat: validasi media dan teks menolak input berisiko", () => {
  assert.equal(getSafeStickerMimeType({ mimetype: "image/jpeg" }), "image/jpeg");
  assert.equal(getSafeStickerMimeType({ mimetype: "image/png" }), "image/png");
  assert.equal(getSafeStickerMimeType({ mimetype: "video/mp4" }), null);
  assert.equal(validateStickerImage(Buffer.from("ok"), { mimetype: "image/png" }).error, undefined);
  assert.equal(validateStickerImage(Buffer.alloc(10 * 1024 * 1024 + 1), { mimetype: "image/png" }).error, "too_large");
  assert.equal(validateStickerText("  halo   pak  ").text, "halo pak");
  assert.equal(validateStickerText("").error, "empty");
  assert.equal(validateStickerText("x".repeat(181)).error, "too_long");
});

test("test cepat: gambar langsung dan quoted image ditemukan", () => {
  const imageMessage = { mimetype: "image/jpeg", fileLength: "10" };
  const direct = getStickerImageSource(
    { message: { imageMessage } },
    { imageMessage }
  );
  assert.equal(direct.message, imageMessage);
  assert.equal(direct.source.message.imageMessage, imageMessage);

  const quotedImage = { mimetype: "image/png", fileLength: "10" };
  const reply = getStickerImageSource(
    {
      key: { remoteJid: "123@g.us" },
      message: {
        extendedTextMessage: {
          contextInfo: { stanzaId: "quoted-1", quotedMessage: { imageMessage: quotedImage } },
        },
      },
    },
    { extendedTextMessage: { contextInfo: { quotedMessage: { imageMessage: quotedImage } } } }
  );
  assert.equal(reply.message, quotedImage);
  assert.equal(reply.source.message.imageMessage, quotedImage);
});

test("test cepat: renderer menghasilkan WebP sticker", async () => {
  const source = await sharp({
    create: { width: 80, height: 40, channels: 4, background: { r: 120, g: 80, b: 220, alpha: 1 } },
  }).png().toBuffer();
  const imageSticker = await renderImageSticker(source);
  assertWebp(imageSticker);

  const bratSticker = await renderTextSticker("apasihhh 😒", "brat");
  assert.equal(bratSticker.error, undefined);
  assertWebp(bratSticker.buffer);

  const iqcSticker = await renderTextSticker("yang ytta aja", "iqc");
  assert.equal(iqcSticker.error, undefined);
  assertWebp(iqcSticker.buffer);
});

console.log("Test cepat sticker selesai: tanpa WhatsApp, Supabase, Groq, VirusTotal, Jina, atau jaringan eksternal.");
