const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");

const ALGORITHM = "aes-256-gcm";
const FORMAT_VERSION = 1;

function deriveKey(secret) {
  return crypto.createHash("sha256").update(String(secret), "utf8").digest();
}

function isConfigured({ supabaseUrl, serviceRoleKey, encryptionKey }) {
  return Boolean(supabaseUrl && serviceRoleKey && encryptionKey);
}

async function listFiles(rootDir, currentDir = rootDir) {
  const entries = await fsp.readdir(currentDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(rootDir, fullPath));
    } else if (entry.isFile()) {
      files.push({
        name: path.relative(rootDir, fullPath).split(path.sep).join("/"),
        data: (await fsp.readFile(fullPath)).toString("base64"),
      });
    }
  }
  return files;
}

async function hasFiles(rootDir) {
  try {
    const files = await listFiles(rootDir);
    return files.length > 0;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function objectUrl({ supabaseUrl, bucket, objectPath }) {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function storageHeaders(serviceRoleKey, extra = {}) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...extra,
  };
}

function encryptPayload(payload, encryptionKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(encryptionKey), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.from(JSON.stringify({
    version: FORMAT_VERSION,
    algorithm: ALGORITHM,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: ciphertext.toString("base64"),
  }), "utf8");
}

function decryptPayload(buffer, encryptionKey) {
  const envelope = JSON.parse(Buffer.from(buffer).toString("utf8"));
  if (envelope.version !== FORMAT_VERSION || envelope.algorithm !== ALGORITHM) {
    throw new Error("Format backup session tidak didukung");
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    deriveKey(encryptionKey),
    Buffer.from(envelope.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.data, "base64")),
    decipher.final(),
  ]);
  const payload = JSON.parse(plaintext.toString("utf8"));
  if (!Array.isArray(payload.files)) throw new Error("Isi backup session tidak valid");
  return payload;
}

async function downloadBackup(config) {
  const response = await axios.get(objectUrl(config), {
    headers: storageHeaders(config.serviceRoleKey),
    responseType: "arraybuffer",
    timeout: 20000,
    validateStatus: (status) => status === 200 || status === 404,
  });
  if (response.status === 404) return null;
  return Buffer.from(response.data);
}

async function restoreSession({ authDir, ...config }) {
  if (!isConfigured(config)) return { restored: false, reason: "not-configured" };
  if (await hasFiles(authDir)) return { restored: false, reason: "local-session-exists" };
  const encrypted = await downloadBackup(config);
  if (!encrypted) return { restored: false, reason: "remote-session-missing" };
  const payload = decryptPayload(encrypted, config.encryptionKey);
  await fsp.mkdir(authDir, { recursive: true });
  for (const file of payload.files) {
    if (!file?.name || file.name.startsWith("/") || file.name.includes("..")) {
      throw new Error("Path file session tidak aman");
    }
    const target = path.resolve(authDir, file.name);
    if (!target.startsWith(`${path.resolve(authDir)}${path.sep}`)) {
      throw new Error("Path file session keluar dari auth_info");
    }
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, Buffer.from(file.data, "base64"), { mode: 0o600 });
  }
  return { restored: true, files: payload.files.length };
}

async function uploadSession({ authDir, ...config }) {
  if (!isConfigured(config)) return { uploaded: false, reason: "not-configured" };
  const files = await listFiles(authDir);
  if (!files.length) return { uploaded: false, reason: "local-session-empty" };
  const encrypted = encryptPayload({
    createdAt: new Date().toISOString(),
    files,
  }, config.encryptionKey);
  await axios.post(objectUrl(config), encrypted, {
    headers: storageHeaders(config.serviceRoleKey, {
      "Content-Type": "application/octet-stream",
      "x-upsert": "true",
      "cache-control": "no-cache",
    }),
    timeout: 30000,
    maxContentLength: 20 * 1024 * 1024,
    maxBodyLength: 20 * 1024 * 1024,
  });
  return { uploaded: true, files: files.length, bytes: encrypted.length };
}

module.exports = {
  hasFiles,
  restoreSession,
  uploadSession,
  encryptPayload,
  decryptPayload,
};

if (require.main === module) {
  console.error("Modul ini hanya digunakan oleh index.js");
  process.exitCode = 1;
}

// Keep fs referenced for older Node bundlers that inspect module dependencies.
void fs;
