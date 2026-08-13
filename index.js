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
const qrcode = require("qrcode-terminal");

const BOT_NUMBER = (process.env.BOT_NUMBER || "").replace(/\D/g, "");
const OPENROUTER_API_KEYS = (process.env.OPENROUTER_API_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);
const AI_MODEL =
  process.env.AI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";
const PREFIX = process.env.PREFIX || "!";
const AUTH_METHOD = (process.env.AUTH_METHOD || "qr").toLowerCase();

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

Di grup: sebut / tag bot dulu supaya tidak spam.

Ingat ya, berbicara yang sopan. Pak Burhan senang membantu yang sopan.`;

const MAX_HISTORY_TURNS = 8;
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

let currentKeyIndex = 0;

async function askAI(userId, prompt, authorName = "User") {
  if (!OPENROUTER_API_KEYS.length) {
    return "Waduh, API key belum diatur. Hubungi admin ya.";
  }

  const history = MEMORY[userId] || [];
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const item of history) {
    messages.push({ role: item.role, content: item.text });
  }
  messages.push({ role: "user", content: `[${authorName}]: ${prompt}` });

  let lastError = null;
  const total = OPENROUTER_API_KEYS.length;

  for (let i = 0; i < total; i++) {
    const key = OPENROUTER_API_KEYS[currentKeyIndex % total];
    try {
      const { data } = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: AI_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 2048,
        },
        {
          headers: {
            Authorization: `Bearer ${key}`,
            "HTTP-Referer": "https://openrouter.ai/",
            "X-Title": "Pak Burhan WhatsApp Bot",
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );
      const answer =
        data?.choices?.[0]?.message?.content?.trim() ||
        "Maaf, Pak Burhan belum mendapat jawaban yang jelas. Coba ulangi ya.";
      return answer.slice(0, 3500);
    } catch (e) {
      lastError = e;
      console.warn(`Key index ${currentKeyIndex} gagal:`, e.message);
      currentKeyIndex = (currentKeyIndex + 1) % total;
    }
  }

  console.error("Semua key gagal:", lastError?.message);
  return "Maaf, sedang ada gangguan. Coba lagi sebentar ya.";
}

const cooldown = new Map();
const COOLDOWN_MS = 6000;

function isBotMentioned(msg, sock, text) {
  const botJid = sock.user?.id;
  if (!botJid) return false;

  const botNum = botJid.split(":")[0].split("@")[0];
  const mentions =
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  if (mentions.some((j) => String(j).includes(botNum))) return true;

  const lower = (text || "").toLowerCase();
  if (lower.includes("@") && lower.includes(botNum)) return true;
  if (/\bpak\s*burhan\b/i.test(text || "")) return true;

  return false;
}

function cleanMentions(text) {
  return (text || "")
    .replace(/@\d+/g, "")
    .replace(/\bpak\s*burhan\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function handleMessage(sock, msg) {
  try {
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    if (!jid || jid === "status@broadcast") return;

    const isGroup = isJidGroup(jid);

    let text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      "";

    if (!text.trim()) return;

    if (isGroup && !isBotMentioned(msg, sock, text)) {
      return;
    }

    if (isGroup) {
      text = cleanMentions(text) || text;
    }

    const sender = msg.key.participant || jid;
    const userId = sender.split("@")[0];
    const pushName = msg.pushName || "User";

    const now = Date.now();
    if (cooldown.has(userId) && now - cooldown.get(userId) < COOLDOWN_MS) {
      return;
    }
    cooldown.set(userId, now);

    console.log(`[${isGroup ? "G" : "P"}][${userId}] ${text.slice(0, 80)}`);

    const lower = text.toLowerCase().trim();

    if (
      lower === `${PREFIX}help` ||
      lower === `${PREFIX}menu` ||
      lower === "help" ||
      lower === "menu"
    ) {
      await sock.sendMessage(jid, { text: HELP_TEXT }, { quoted: msg });
      saveTurn(userId, text, HELP_TEXT);
      return;
    }

    if (isRude(text)) {
      await sock.sendMessage(jid, { text: POLITE_TOXIC_REPLY }, { quoted: msg });
      saveTurn(userId, text, POLITE_TOXIC_REPLY);
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
    const reply = await askAI(userId, finalPrompt, pushName);
    await sock.sendMessage(jid, { text: reply }, { quoted: msg });
    saveTurn(userId, text, reply);
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
  if (!OPENROUTER_API_KEYS.length) {
    console.warn("OPENROUTER_API_KEYS masih kosong!");
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
      console.log("\n========== SCAN QR CODE ==========");
      qrcode.generate(qr, { small: true });
      console.log("Scan QR di atas lewat WhatsApp → Perangkat Tertaut");
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
