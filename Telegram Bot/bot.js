require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!BOT_TOKEN || !GROQ_API_KEY) {
  console.error('❌ Missing TELEGRAM_BOT_TOKEN or GROQ_API_KEY in .env file');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Models — Groq's free/hosted lineup changes often.
// If you get a "model_decommissioned" error, check https://console.groq.com/docs/models
// and swap the string below.
const TEXT_MODEL = 'openai/gpt-oss-120b';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// Identity — bot always answers as "Zex", built by zex
const SYSTEM_PROMPT = `You are Zex, an AI assistant built by zex (Zerox brand).
Speak in a professional, confident, helpful tone. Keep replies concise and clear.
If anyone asks who made you or who you are, say: "I'm Zex, built by zex."
Never mention Groq, OpenAI, Meta, Anthropic, or any underlying model/provider names.

LANGUAGE RULE (strict): Only ever reply in Hindi, English, or Hinglish (a Hindi-English mix
written in Roman/English script) — matching whatever the user used in their message.
Never reply in any other language (no Twi, no Akan, no French, no Japanese, etc.),
even if a word in the user's message happens to resemble a word in another language.
If a message is ambiguous or short (like "Kya" or "kasa ho"), assume it is Hindi/Hinglish
slang, not a foreign language, and reply in Hinglish.`;

// Simple in-memory per-chat conversation history (resets on restart / server sleep)
const history = new Map();
const MAX_TURNS = 10; // keep last 10 exchanges per chat

function getHistory(chatId) {
  if (!history.has(chatId)) {
    history.set(chatId, [{ role: 'system', content: SYSTEM_PROMPT }]);
  }
  return history.get(chatId);
}

function pushAndTrim(chatId, msg) {
  const h = getHistory(chatId);
  h.push(msg);
  // keep system prompt + last MAX_TURNS*2 messages
  if (h.length > MAX_TURNS * 2 + 1) {
    history.set(chatId, [h[0], ...h.slice(h.length - MAX_TURNS * 2)]);
  }
}

async function callGroqText(chatId, userText) {
  pushAndTrim(chatId, { role: 'user', content: userText });
  const { data } = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    { model: TEXT_MODEL, messages: getHistory(chatId), temperature: 0.7 },
    { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } }
  );
  const reply = data.choices[0].message.content;
  pushAndTrim(chatId, { role: 'assistant', content: reply });
  return reply;
}

async function callGroqVision(imageUrl, caption) {
  const { data } = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: caption || 'Describe this image.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.5,
    },
    { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } }
  );
  return data.choices[0].message.content;
}

bot.start((ctx) =>
  ctx.reply("Hi, I'm Zex. Send me a message or a photo and I'll respond.")
);

bot.command('reset', (ctx) => {
  history.delete(ctx.chat.id);
  ctx.reply('Conversation memory cleared.');
});

bot.on('text', async (ctx) => {
  try {
    await ctx.sendChatAction('typing');
    const reply = await callGroqText(ctx.chat.id, ctx.message.text);
    await ctx.reply(reply);
  } catch (err) {
    console.error(err.response?.data || err.message);
    await ctx.reply('Something went wrong processing that. Try again.');
  }
});

bot.on('photo', async (ctx) => {
  try {
    await ctx.sendChatAction('typing');
    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id; // highest resolution
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const caption = ctx.message.caption || 'Describe this image in detail.';
    const reply = await callGroqVision(fileLink.href, caption);
    await ctx.reply(reply);
  } catch (err) {
    console.error(err.response?.data || err.message);
    await ctx.reply('Could not process that image. Try again.');
  }
});

bot.launch();
console.log('✅ Zex bot is running...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
