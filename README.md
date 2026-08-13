# Pak Burhan WhatsApp Bot

Bot WhatsApp persona **Pak Burhan** (wali kelas 7D).  
Stack: **Node.js + Baileys + OpenRouter**

## Fitur
- Login **QR Code** (default) atau **Pairing Code**
- Chat AI gaya Pak Burhan
- Memory percakapan
- Anti kata kasar
- `!help` / `!menu` / `!cari`
- Auto web search (Tavily)
- Rotasi multi API key OpenRouter
- **Grup: hanya balas jika di-tag / disebut "Pak Burhan"**
- Private chat: balas semua pesan
- Cocok untuk Railway (Volume + worker)

## Setup

```bash
npm install
cp .env.example .env
npm start
```

### Variables
| Key | Keterangan |
|-----|------------|
| `AUTH_METHOD` | `qr` (default) atau `pairing` |
| `BOT_NUMBER` | Wajib jika pairing, format `628...` |
| `OPENROUTER_API_KEYS` | Satu atau lebih, dipisah koma |
| `AI_MODEL` | Default Nemotron free |
| `TAVILY_API_KEY` | Opsional |
| `PREFIX` | Default `!` |

## Railway
1. Deploy from GitHub
2. Isi Variables
3. **Volume** mount: `/app`
4. Start: `node index.js` (atau Procfile worker)
5. Buka **Logs** → scan QR
6. WhatsApp → Perangkat Tertaut → Scan

## Login ulang
Hapus `auth_info` di volume (atau Wipe Volume) lalu redeploy.
