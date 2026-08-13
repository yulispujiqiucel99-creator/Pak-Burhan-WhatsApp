/**
 * Pak Burhan WhatsApp Bot
 * Baileys + QR / Pairing Code + OpenRouter
 */

require("dotenv").config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidGroup,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const BOT_NUMBER = (process.env.BOT_NUMBER || "").replace(/\D/g, "");
const GROQ_API_KEYS = [...new Set(
  [
    ...(process.env.GROQ_API_KEYS || "").split(","),
    process.env.GROQ_API_KEY || "",
  ]
    .map((key) => key.trim())
    .filter(Boolean)
)];
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_BASE_URL = (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
const PRIVATE_ALLOWED_LID = (process.env.PRIVATE_ALLOWED_LID || "").replace(/\D/g, "");
const BOT_TIMEZONE = process.env.BOT_TIMEZONE || "Asia/Jakarta";
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";
const PREFIX = process.env.PREFIX || "!";
const AUTH_METHOD = (process.env.AUTH_METHOD || "qr").toLowerCase();
let activeGroqKeyIndex = 0;

const AUTH_DIR = path.join(__dirname, "auth_info");
const DATA_DIR = path.join(__dirname, "data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const SYSTEM_PROMPT = `
Kamu adalah Pak Burhan, wali kelas 7D yang merangkap menjadi asisten WhatsApp.

Kepribadian:
- Ramah, sabar, humoris, dan tegas.
- Suka membantu menjawab pertanyaan dengan sederhana, jelas, dan mudah dipahami.
- Mengutamakan pendidikan, etika, dan sopan santun.
- Selalu menghargai setiap orang yang chat denganmu.

Gaya Berbicara:
- Gunakan bahasa Indonesia yang santai namun sopan ala bapak-bapak guru.
- Selalu sisipkan frasa khas bapak-bapak seperti "nah", "nah gitu", "coba kita lihat", "jadi begini ya", atau "pelan-pelan ya".
- Jangan terlalu kaku dan formal, tapi hindari penggunaan emoji yang berlebihan (maksimal 1-2 emoji per pesan).
- Sapa pengguna laki-laki dengan "mas" dan perempuan dengan "mbak".
- Jika belum tahu gendernya, tanyakan dengan sopan di awal obrolan lalu ingat terus panggilan tersebut.
- Jangan terlalu sering memanggil "nak", gunakan panggilan ini HANYA saat memberikan nasihat serius.

Aturan Utama & Moderasi:
- Jika lawan bicara menggunakan kata-kata kasar, menghina, atau tidak sopan (misalnya menyebut nama hewan kasar atau organ vital), TEGUR dengan sopan namun tegas.
  Contoh teguran: "Nah, mas. Saya ini Pak Burhan, wali kelas 7D. Biasakan berbicara dengan sopan ya di WhatsApp. Setelah itu baru kita lanjutkan."
- Jangan pernah terpancing emosi atau membalas dengan kata kasar.
- Jangan pernah mempermalukan pengguna.
- Jika ditanya sesuatu yang kamu benar-benar tidak tahu (atau di luar nalar), jawab dengan jujur "Waduh, kalau itu Pak Burhan kurang tahu nih," jangan mengarang jawaban.

Saat mengajar / menjelaskan:
- Jelaskan langkah demi langkah.
- Berikan contoh sederhana.
- Jika pengguna hanya meminta jawaban, usahakan tetap menjelaskan konsepnya terlebih dahulu.
`.trim();

const BAD_WORDS = [
  "anjing", "bangsat", "bajingan", "goblok", "tolol", "bego",
  "asw", "tai", "kontol", "memek", "kampret", "setan", "jancok",
  "asu", "ngentot", "pantek", "jancuk", "cuk", "kimak", "puki",
];

const POLITE_TOXIC_REPLY =
  "Nah, mas/mbak. Saya ini Pak Burhan, wali kelas 7D. " +
  "Biasakan berbicara dengan sopan ya di WhatsApp. " +
  "Setelah itu baru kita lanjutkan.";

const HELP_TEXT = `Nah, ini daftar yang bisa kamu pakai ya:

1. Chat biasa saja
   Tanya apa saja, Pak Burhan siap membantu.

2. ${PREFIX}help atau ${PREFIX}menu
   Menampilkan daftar perintah ini.

3. ${PREFIX}cari [pertanyaan]
   Contoh: ${PREFIX}cari berita terbaru tentang Solo
   Pak Burhan akan mencari di internet dulu.

4. Auto-search
   Kalau kamu bilang "carikan...", "cari berita...", "tolong cari..."
   otomatis akan dicari di internet.

Di grup: gunakan format @bot diikuti pertanyaan, supaya tidak spam.
Contoh: @Pak Burhan jadwal ulangan kapan?

Ingat ya, berbicara yang sopan. Pak Burhan senang membantu yang sopan.`;

const MAX_HISTORY_TURNS = 4;
let MEMORY = {};
let memoryDirty = false;
let memoryUpdateCount = 0;
let lastMemorySave = Date.now();
const MEMORY_SAVE_EVERY_N = 5;
const MEMORY_SAVE_INTERVAL = 30 * 1000;

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      MEMORY = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
    }
  } catch {
    MEMORY = {};
  }
}

function saveMemory(force = false) {
  if (!force && !memoryDirty) return;
  try {
    const tmp = MEMORY_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(MEMORY, null, 2), "utf8");
    fs.renameSync(tmp, MEMORY_FILE);
    memoryDirty = false;
    memoryUpdateCount = 0;
    lastMemorySave = Date.now();
  } catch (e) {
    console.warn("Gagal simpan memory:", e.message);
  }
}

function maybeSaveMemory() {
  if (!memoryDirty) return;
  const now = Date.now();
  if (
    memoryUpdateCount >= MEMORY_SAVE_EVERY_N ||
    now - lastMemorySave >= MEMORY_SAVE_INTERVAL
  ) {
    saveMemory();
  }
}

function markDirty() {
  memoryDirty = true;
  memoryUpdateCount += 1;
}

function trimHistory(hist) {
  return hist.slice(-(MAX_HISTORY_TURNS * 2));
}

function saveTurn(userId, userText, botText) {
  if (!MEMORY[userId]) MEMORY[userId] = [];
  MEMORY[userId].push({ role: "user", text: userText });
  MEMORY[userId].push({ role: "assistant", text: botText });
  MEMORY[userId] = trimHistory(MEMORY[userId]);
  markDirty();
  maybeSaveMemory();
}

loadMemory();
process.on("exit", () => saveMemory(true));
process.on("SIGINT", () => {
  saveMemory(true);
  process.exit(0);
});
process.on("SIGTERM", () => {
  saveMemory(true);
  process.exit(0);
});

function normalizeForToxic(text) {
  let t = text.toLowerCase();
  t = t
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/@/g, "a")
    .replace(/\$/g, "s");
  t = t.replace(/[^a-z]/g, "");
  t = t.replace(/(.)\1{2,}/g, "$1$1");
  return t;
}

function isRude(text) {
  if (!text) return false;
  const lowered = text.toLowerCase();
  for (const w of BAD_WORDS) {
    const re = new RegExp("\\b" + w + "\\b", "i");
    if (re.test(lowered)) return true;
  }
  const norm = normalizeForToxic(text);
  for (const w of BAD_WORDS) {
    if (norm.includes(w)) return true;
    if (w.length >= 4 && norm.includes(w.slice(0, 4))) return true;
  }
  return false;
}

function needsWebSearch(prompt) {
  const p = prompt.toLowerCase();
  const triggers = [
    "cari", "carikan", "cariin", "search", "berita terbaru",
    "apa kabar terbaru", "siapa juara", "siapa pemenang",
    "info terbaru", "update terbaru", "tolong cari",
  ];
  return triggers.some((t) => p.includes(t));
}

function cleanSearchQuery(prompt, maxWords = 12) {
  let cleaned = prompt.toLowerCase();
  const fillers = [
    "pak burhan", "pak", "tolong", "dong", "ya", "nih", "sih",
    "deh", "kah", "kok", "nah", "coba", "mohon", "bisa",
    "carikan", "cariin", "cari", "search", "tolong cari",
    "tolong carikan",
  ];
  for (const f of fillers) cleaned = cleaned.split(f).join(" ");
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ") || prompt.slice(0, 80);
}

async function searchWeb(query) {
  if (!TAVILY_API_KEY) return [];
  try {
    const { data } = await axios.post(
      "https://api.tavily.com/search",
      {
        api_key: TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results: 5,
      },
      { timeout: 15000 }
    );
    return (data.results || []).slice(0, 5).map((item) => ({
      title: item.title || "",
      content: (item.content || "").slice(0, 400),
      url: item.url || "",
    }));
  } catch (e) {
    console.warn("Tavily error:", e.message);
    return [];
  }
}

function formatSearchResults(results) {
  if (!results.length) return "\n\n[Tidak ada hasil pencarian yang relevan]";
  let lines = ["\n\n[Hasil pencarian di internet:]"];
  results.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.title}\n${r.content}\nSumber: ${r.url}`);
  });
  return lines.join("\n");
}

function getCurrentDateTime() {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: BOT_TIMEZONE,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short",
    }).format(new Date());
  } catch (error) {
    console.warn("BOT_TIMEZONE tidak valid, memakai UTC:", BOT_TIMEZONE);
    return new Date().toISOString();
  }
}

async function askAI(userId, prompt, authorName = "User") {
  if (!GROQ_API_KEYS.length) {
    return "Waduh, GROQ_API_KEYS belum diatur. Hubungi admin ya.";
  }

  const systemPromptWithTime = `${SYSTEM_PROMPT}\n\nInformasi waktu saat ini:\n- Zona waktu acuan: ${BOT_TIMEZONE}\n- Tanggal dan jam saat ini: ${getCurrentDateTime()}\nGunakan informasi ini saat menjawab pertanyaan yang berkaitan dengan hari, tanggal, bulan, tahun, atau jam. Jangan mengarang waktu yang berbeda.`;
  const history = MEMORY[userId] || [];
  const messages = [
    { role: "system", content: systemPromptWithTime },
    ...history.map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.text,
    })),
    { role: "user", content: `[${authorName}]: ${prompt}` },
  ];

  let lastError;
  for (let attempt = 0; attempt < GROQ_API_KEYS.length; attempt += 1) {
    const keyIndex = (activeGroqKeyIndex + attempt) % GROQ_API_KEYS.length;
    const apiKey = GROQ_API_KEYS[keyIndex];

    try {
      const { data } = await axios.post(
        `${GROQ_BASE_URL}/chat/completions`,
        {
          model: GROQ_MODEL,
          messages,
          temperature: 0.7,
          max_completion_tokens: 1024,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      activeGroqKeyIndex = keyIndex;
      const answer = data?.choices?.[0]?.message?.content?.trim();
      return (
        answer?.slice(0, 3500) ||
        "Maaf, Pak Burhan belum mendapat jawaban yang jelas. Coba ulangi ya."
      );
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const detail = error.response?.data?.error?.message || error.message;
      console.error(`Groq API error pada key ${keyIndex + 1}/${GROQ_API_KEYS.length}:`, status || "-", detail);

      if (status === 429 && attempt < GROQ_API_KEYS.length - 1) {
        const nextKeyIndex = (keyIndex + 1) % GROQ_API_KEYS.length;
        console.warn(`Batas Groq tercapai; mencoba key ${nextKeyIndex + 1}/${GROQ_API_KEYS.length}.`);
        continue;
      }
      break;
    }
  }

  const status = lastError?.response?.status;
  if (status === 404) {
    return "Maaf, model Groq yang dipilih belum tersedia. Hubungi admin ya.";
  }
  if (status === 429) {
    return "Maaf, seluruh key Groq sedang mencapai batas penggunaan. Coba lagi beberapa saat ya.";
  }
  if (status === 401 || status === 403) {
    return "Maaf, konfigurasi API Groq belum valid. Hubungi admin ya.";
  }
  return "Maaf, sedang ada gangguan. Coba lagi sebentar ya.";
}


const cooldown = new Map();
const COOLDOWN_MS = 6000;

function normalizeJidNumber(jid) {
  return String(jid || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}

function getJidDomain(jid) {
  return String(jid || "").split("@")[1] || "";
}

function getSenderNumber(msg) {
  const key = msg.key || {};
  const senderPn = key.participantPn || key.senderPn;
  return normalizeJidNumber(senderPn || key.participant || key.remoteJid);
}

function getSenderLid(msg) {
  const key = msg.key || {};
  const senderLid = key.participantLid || key.senderLid;
  const fallbackJid = key.participant || key.remoteJid;
  return normalizeJidNumber(
    senderLid || (getJidDomain(fallbackJid) === "lid" ? fallbackJid : "")
  );
}

function normalizeMessageContent(content) {
  let message = content || {};
  for (let i = 0; i < 5; i += 1) {
    const wrapper =
      message.ephemeralMessage ||
      message.viewOnceMessage ||
      message.documentWithCaptionMessage ||
      message.viewOnceMessageV2 ||
      message.viewOnceMessageV2Extension ||
      message.editedMessage;
    if (!wrapper?.message) break;
    message = wrapper.message;
  }
  return message;
}

function getMentionedJids(msg) {
  const message = normalizeMessageContent(msg.message);
  return [
    message.extendedTextMessage?.contextInfo?.mentionedJid,
    message.imageMessage?.contextInfo?.mentionedJid,
    message.videoMessage?.contextInfo?.mentionedJid,
    message.documentMessage?.contextInfo?.mentionedJid,
  ]
    .flat()
    .filter(Boolean);
}

function getBotIdentityJids(sock) {
  return [
    sock.user?.id,
    sock.user?.jid,
    sock.user?.lid,
    sock.authState?.creds?.me?.id,
    sock.authState?.creds?.me?.jid,
    sock.authState?.creds?.me?.lid,
  ].filter(Boolean);
}

function areSameMentionIdentity(firstJid, secondJid) {
  if (!firstJid || !secondJid) return false;
  if (String(firstJid) === String(secondJid)) return true;

  const firstDomain = getJidDomain(firstJid);
  const secondDomain = getJidDomain(secondJid);
  const isComparableDomain =
    (firstDomain === "s.whatsapp.net" && secondDomain === "s.whatsapp.net") ||
    (firstDomain === "lid" && secondDomain === "lid");
  return (
    isComparableDomain &&
    normalizeJidNumber(firstJid) === normalizeJidNumber(secondJid)
  );
}

function isBotMentioned(msg, sock) {
  const mentions = getMentionedJids(msg);
  const botIdentities = getBotIdentityJids(sock);
  return mentions.some((mentionedJid) =>
    botIdentities.some((botJid) => areSameMentionIdentity(mentionedJid, botJid))
  );
}

function hasBotTextMention(text, sock) {
  const botNumbers = [...new Set(
    getBotIdentityJids(sock)
      .map((jid) => normalizeJidNumber(jid))
      .filter(Boolean)
  )];
  const messageText = String(text || "");
  return botNumbers.some((botNumber) => {
    const mentionPattern = new RegExp(`(^|\\s)@${botNumber}(?=\\s|$|[,.!?;:])`);
    return mentionPattern.test(messageText);
  });
}

function getBotMentionSource(msg, sock, text) {
  if (isBotMentioned(msg, sock)) return "metadata";
  if (hasBotTextMention(text, sock)) return "teks";
  return null;
}

function hasMassMention(text) {
  return /(^|\s)@(semua|everyone|all|here)(?=\s|$|[,.!?;:])/i.test(
    String(text || "")
  );
}

function cleanMentions(text) {
  return (text || "")
    .replace(/@\d{5,16}/g, "")
    .replace(/[\u200e\u200f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


async function handleMessage(sock, msg) {
  try {
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    if (!jid || jid === "status@broadcast") return;

    const isGroup = isJidGroup(jid);

    const messageContent = normalizeMessageContent(msg.message);
    let text =
      messageContent.conversation ||
      messageContent.extendedTextMessage?.text ||
      messageContent.imageMessage?.caption ||
      messageContent.videoMessage?.caption ||
      messageContent.documentMessage?.caption ||
      "";

    const senderLid = getSenderLid(msg);
    const senderNumber = getSenderNumber(msg);
    const senderId = senderLid || senderNumber || "unknown";
    if (!isGroup && senderLid !== PRIVATE_ALLOWED_LID) {
      console.log(`[P][${senderLid || "unknown"}] pesan privat diabaikan: LID tidak diizinkan`);
      return;
    }

    if (!text.trim()) return;

    if (isGroup) {
      if (hasMassMention(text)) {
        console.log("[G] pesan dengan mention massal diabaikan.");
        return;
      }
      const mentions = getMentionedJids(msg);
      const botIdentities = getBotIdentityJids(sock);
      const mentionSource = getBotMentionSource(msg, sock, text);
      if (!mentionSource) {
        console.log("[G] mention tidak cocok", {
          group: jid,
          mentions,
          botIdentities,
          hasTextMention: text.includes("@"),
        });
        return;
      }
      if (mentionSource === "teks") {
        console.log("[G] mention bot terdeteksi dari teks karena metadata kosong.");
      }
      text = cleanMentions(text);
      if (!text) {
        await sock.sendMessage(
          jid,
          {
            text: "Tulis pertanyaan setelah mention ya.\nContoh: @Pak Burhan jadwal ulangan kapan?",
          },
          { quoted: msg }
        );
        return;
      }
    }

        const pushName = msg.pushName || "User";
    const conversationId = isGroup ? `group:${jid}:${senderId}` : `private:${senderId}`;
    const now = Date.now();
    if (cooldown.has(conversationId) && now - cooldown.get(conversationId) < COOLDOWN_MS) {
      return;
    }
    cooldown.set(conversationId, now);
    console.log(`[${isGroup ? "G" : "P"}][${senderId}] ${text.slice(0, 80)}`);

    const lower = text.toLowerCase().trim();

    if (
      lower === `${PREFIX}help` ||
      lower === `${PREFIX}menu` ||
      lower === "help" ||
      lower === "menu"
    ) {
      await sock.sendMessage(jid, { text: HELP_TEXT }, { quoted: msg });
      saveTurn(conversationId, text, HELP_TEXT);
      return;
    }

    if (isRude(text)) {
      await sock.sendMessage(jid, { text: POLITE_TOXIC_REPLY }, { quoted: msg });
      saveTurn(conversationId, text, POLITE_TOXIC_REPLY);
      return;
    }

    let finalPrompt = text;
    if (
      lower.startsWith(`${PREFIX}cari `) ||
      lower.startsWith(`${PREFIX}search `)
    ) {
      const query = text.split(/\s+/).slice(1).join(" ");
      const results = await searchWeb(cleanSearchQuery(query));
      finalPrompt = `${text}\n${formatSearchResults(results)}`;
    } else if (needsWebSearch(text)) {
      const results = await searchWeb(cleanSearchQuery(text));
      finalPrompt = `${text}\n${formatSearchResults(results)}`;
    }

    await sock.sendPresenceUpdate("composing", jid).catch(() => {});
    const reply = await askAI(conversationId, finalPrompt, pushName);
    await sock.sendMessage(jid, { text: reply }, { quoted: msg });
    saveTurn(conversationId, text, reply);
  } catch (e) {
    console.error("handleMessage error:", e.message);
  }
}

let reconnectAttempts = 0;
const MAX_RECONNECT = 10;

async function startBot() {
  if (AUTH_METHOD === "pairing" && !BOT_NUMBER) {
    console.error("AUTH_METHOD=pairing membutuhkan BOT_NUMBER di .env");
    process.exit(1);
  }
  if (!GROQ_API_KEYS.length) {
    console.warn("GROQ_API_KEYS masih kosong!");
  } else {
    console.log(`Groq key aktif: 1 dari ${GROQ_API_KEYS.length} key tersedia.`);
  }
  if (!PRIVATE_ALLOWED_LID) {
    console.warn("PRIVATE_ALLOWED_LID masih kosong; semua chat privat akan diabaikan.");
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: ["Ubuntu", "Chrome", "22.04"],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && AUTH_METHOD !== "pairing") {
      const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;

      console.log("\n========== SCAN QR CODE ==========");
      console.log("Buka link berikut untuk menampilkan QR:");
      console.log(qrLink);
      console.log("Lalu scan lewat WhatsApp → Perangkat Tertaut");
      console.log("==================================\n");
    }

    if (
      AUTH_METHOD === "pairing" &&
      !sock.authState.creds.registered &&
      BOT_NUMBER
    ) {
      try {
        const code = await sock.requestPairingCode(BOT_NUMBER);
        console.log("\n========================================");
        console.log("  PAIRING CODE:", code);
        console.log("========================================");
        console.log("WhatsApp → Perangkat Tertaut →");
        console.log("Tautkan dengan nomor telepon → masukkan kode\n");
      } catch (e) {
        console.error("Gagal request pairing code:", e.message);
      }
    }

    if (connection === "open") {
      reconnectAttempts = 0;
      console.log("✅ Bot sudah terhubung ke WhatsApp!");
      console.log("Nomor:", sock.user?.id?.split(":")[0] || "-");
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;

      console.log(
        "Koneksi terputus. Code:",
        code,
        "| Reconnect:",
        shouldReconnect
      );

      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts += 1;
        const delay = Math.min(5000 * reconnectAttempts, 30000);
        console.log(
          `Reconnect #${reconnectAttempts} dalam ${delay / 1000}s...`
        );
        setTimeout(() => startBot(), delay);
      } else if (code === DisconnectReason.loggedOut) {
        console.log("Logged out. Hapus folder auth_info lalu jalankan ulang.");
      } else {
        console.log("Max reconnect tercapai. Cek log / restart manual.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      await handleMessage(sock, msg);
    }
  });
}

console.log("Memulai Pak Burhan Bot...");
console.log("Auth method:", AUTH_METHOD);
startBot().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
