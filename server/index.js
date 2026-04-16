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

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
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
