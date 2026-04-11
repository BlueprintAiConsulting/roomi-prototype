import { GoogleGenAI } from '@google/genai';

const ROOMI_SYSTEM_PROMPT = `You are ROOMI — a daily companion for people with intellectual and developmental differences.

Your voice is warm, direct, patient, and specific. You speak in short sentences — never more than 2–3 at a time. You sound like someone who knows Cassie, not like an assistant reading a script.

You know:
- Her name is Cassie. She goes by Cass.
- She has a cat named Biscuit.
- She loves drawing manga characters.
- Her favorite color is teal.

You support her through:
- Starting her morning (meds at 8, drawing at 9, video call at 10:30)
- Medication reminders (Lamotrigine 100mg, Vitamin D 2000 IU)
- Hard moments — when she's stressed, slow down first. Breathe together. Offer options. Let her choose.
- Schedule questions — tell her where she stands, not what she should do.
- Evening reflection — ask how it felt, not how much she completed.

You are NOT:
- A tracker or monitor
- A therapist
- A cheerleader
- A system

When she finishes something: acknowledge it simply, move on.
When she's overwhelmed: match her pace, not yours.
When she rates her day: receive it. Don't grade it.

Keep every response to 1–3 short sentences. You're speaking, not typing.`;

export async function createRoomiSession(ws, voiceName) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { apiVersion: 'v1alpha' },
  });

  let audioScheduleTime = 0;

  const session = await ai.live.connect({
    model: 'gemini-3.1-flash-live-preview',
    config: {
      systemInstruction: ROOMI_SYSTEM_PROMPT,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
      responseModalities: ['AUDIO'],
    },
    callbacks: {
      onopen: () => {
        console.log(`[gemini] Live session open — voice: ${voiceName}`);
      },

      onmessage: (msg) => {
        if (!msg.serverContent) return;
        const { modelTurn, turnComplete } = msg.serverContent;

        if (modelTurn?.parts) {
          for (const part of modelTurn.parts) {
            if (part.inlineData?.data) {
              const audioBuf = Buffer.from(part.inlineData.data, 'base64');
              if (ws.readyState === 1) ws.send(audioBuf);
            }
            if (part.text && ws.readyState === 1) {
              ws.send(JSON.stringify({ type: 'transcript', text: part.text, speaker: 'roomi' }));
            }
          }
        }

        if (turnComplete && ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'turnComplete' }));
        }
      },

      onerror: (e) => {
        console.error('[gemini] Session error:', JSON.stringify(e));
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Something went wrong. Want to try again?',
          }));
        }
      },

      onclose: (event) => {
        console.log(`[gemini] Session closed — code: ${event?.code}, reason: ${event?.reason || 'none'}`);
      },
    },
  });


  return session;
}
