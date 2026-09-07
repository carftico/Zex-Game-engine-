# Zex AI Telegram Bot

Text chat + image understanding, via Groq. Bot replies as "Zex".

## Step 1 — Rotate your keys (do this first)

- Telegram: open @BotFather → `/revoke` on this bot → get a fresh token.
- Groq: go to console.groq.com → API Keys → delete old key → create new one
  (real Groq keys start with `gsk_`).

## Step 2 — Termux setup

```bash
pkg update && pkg install nodejs -y
cd zex-ai-bot
npm install
cp .env.example .env
nano .env   # paste your new TELEGRAM_BOT_TOKEN and GROQ_API_KEY, save (Ctrl+O, Enter, Ctrl+X)
node bot.js
```

Bot ab chalu hai — Telegram pe bot ko koi bhi text ya photo bhejo.

## Step 3 — Keep it running 24/7 (free)

Termux band hone par bot ruk jaayega. For 24/7 uptime, free options:

- **Railway** (you already use this per your other bots): push this folder to
  a GitHub repo, connect it on railway.app, set `TELEGRAM_BOT_TOKEN` and
  `GROQ_API_KEY` as environment variables in the Railway dashboard (never in
  code), deploy.
- Or Termux + `termux-wake-lock` + `tmux` to keep it alive on your phone
  while charging.

## Commands

- `/start` — greeting
- `/reset` — clears that chat's conversation memory

## Notes

- Conversation memory is in-RAM only — resets if the bot restarts.
- Model names (`TEXT_MODEL`, `VISION_MODEL` in `bot.js`) may get deprecated by
  Groq over time — check console.groq.com/docs/models if you see a
  `model_decommissioned` error.
