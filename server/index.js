import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createRoomiSession } from './roomiSession.js';

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = [
  'https://blueprintaiconsulting.github.io',
  'http://localhost:5173',
  'http://localhost:3001',
  'http://localhost:3002',
];

// Track active connections
let activeConnections = 0;
const serverStartTime = Date.now();

app.use(express.json({ limit: '50kb' }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (_, res) => res.json({
  status: 'ok',
  service: 'roomi-voice',
  uptime: Math.floor((Date.now() - serverStartTime) / 1000),
  activeConnections,
  memory: process.memoryUsage().heapUsed,
  model: 'gemini-2.5-flash-native-audio-latest',
}));

// ─── Chat API Proxy ──────────────────────────────────────
// Secure proxy for Gemini text chat — API key stays server-side
const chatRateLimit = new Map(); // IP -> { count, resetTime }

app.post('/api/chat', async (req, res) => {
  try {
    // Rate limit: 30 requests per minute per IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    const rateEntry = chatRateLimit.get(ip) || { count: 0, resetTime: now + 60000 };
    if (now > rateEntry.resetTime) {
      rateEntry.count = 0;
      rateEntry.resetTime = now + 60000;
    }
    rateEntry.count++;
    chatRateLimit.set(ip, rateEntry);
    if (rateEntry.count > 30) {
      return res.status(429).json({ error: 'Rate limited. Try again in a minute.' });
    }

    const { systemPrompt, contents, safetySettings, generationConfig } = req.body;

    // Validate required fields
    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({ error: 'Missing or invalid contents array.' });
    }
    if (!systemPrompt || typeof systemPrompt !== 'string') {
      return res.status(400).json({ error: 'Missing systemPrompt.' });
    }

    // Forward to Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[chat] GEMINI_API_KEY not set');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      safetySettings: safetySettings || [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      ],
      generationConfig: generationConfig || {
        temperature: 0.5,
        maxOutputTokens: 200,
        topP: 0.85,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await geminiRes.json();
    return res.json(data);

  } catch (err) {
    console.error('[chat] Proxy error:', err.message);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Gemini API timed out.' });
    }
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Clean up rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of chatRateLimit) {
    if (now > entry.resetTime + 60000) chatRateLimit.delete(ip);
  }
}, 300000);

// ─── Summarize API ──────────────────────────────────────────
// Generates a 1-2 sentence daily summary from conversation messages
app.post('/api/summarize', async (req, res) => {
  try {
    const { messages, userName } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 messages to summarize.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    const transcript = messages
      .map(m => `${m.sender === 'roomi' ? 'ROOMI' : (userName || 'User')}: ${m.text}`)
      .join('\n');

    const summaryPrompt = `Summarize this conversation between ROOMI (a companion) and ${userName || 'the user'} in 1-2 short sentences. Write it as a note about the person's day — what happened, how they felt, anything notable. Be warm and specific. Do NOT use clinical language. Example: "${userName || 'User'} had a good morning. Took meds on time, enjoyed drawing, and mentioned Biscuit knocked cereal off the table."

Conversation:
${transcript}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
      }),
    });

    const data = await geminiRes.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return res.json({ summary });
  } catch (err) {
    console.error('[summarize] Error:', err.message);
    return res.status(500).json({ error: 'Failed to generate summary.' });
  }
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });


wss.on('connection', (ws) => {
  console.log('[ws] Client connected');
  activeConnections++;
  let session = null;

  ws.on('message', async (data, isBinary) => {
    // Text message = JSON control (init, etc.)
    if (!isBinary) {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'init') {
          const voice = msg.voice || 'Aoede';
          const userData = msg.userData || {};
          console.log(`[ws] Init session — voice: ${voice}, user: ${userData.preferredName || 'guest'}`);
          session = await createRoomiSession(ws, voice, userData);
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'ready', voice }));
          }
        }

        if (msg.type === 'transcript' && session) {
          // User spoke — forward as text input too for hybrid mode
          session.sendRealtimeInput({ text: msg.text });
        }
      } catch (e) {
        console.error('[ws] Message parse error:', e.message);
      }
      return;
    }

    // Binary = raw PCM16 audio from browser mic
    if (session) {
      const b64 = Buffer.from(data).toString('base64');
      session.sendRealtimeInput({
        audio: { data: b64, mimeType: 'audio/pcm;rate=16000' },
      });
    }
  });

  ws.on('close', () => {
    console.log('[ws] Client disconnected');
    activeConnections = Math.max(0, activeConnections - 1);
    if (session) {
      try { session.close(); } catch (_) {}
      session = null;
    }
  });

  ws.on('error', (err) => console.error('[ws] Error:', err.message));
});

httpServer.listen(PORT, () => {
  console.log(`🦊 ROOMI voice server on port ${PORT}`);
});
