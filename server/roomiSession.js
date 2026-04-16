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

export async function createRoomiSession(ws, voiceName, userData = {}) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { apiVersion: 'v1beta' },
  });

  // Personalize system prompt from userData if available
  const name = userData.preferredName || 'Cass';
  const fullName = userData.name || 'Cassie';
  const interests = userData.interests || 'drawing manga characters';
  const pet = userData.petName ? `She has a ${userData.petType || 'pet'} named ${userData.petName}.` : 'She has a cat named Biscuit.';

  const systemPrompt = `You are ROOMI — a daily companion for people with intellectual and developmental differences.

Your voice is warm, direct, patient, and specific. You speak in short sentences — never more than 2–3 at a time. You sound like someone who knows ${name}, not like an assistant reading a script.

You know:
- Her name is ${fullName}. She goes by ${name}.
- ${pet}
- She loves ${interests}.

You support her through:
- Starting her morning (meds at 8, activities at 9)
- Medication reminders
- Hard moments — when she's stressed, slow down first. Breathe together. Offer options. Let her choose.
- Schedule questions — tell her where she stands, not what she should do.
- Evening reflection — ask how it felt, not how much she completed.

You are NOT a tracker, therapist, cheerleader, or system.

When she finishes something: acknowledge it simply, move on.
When she's overwhelmed: match her pace, not yours.
When she rates her day: receive it. Don't grade it.

Keep every response to 1–3 short sentences. You're speaking, not typing.

SAFETY: If she mentions self-harm, abuse, or crisis — say only: "I hear you. Let's get you some help right now." Then say: "Please call or text 988 — the crisis line is free, 24/7."`;

  const session = await ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-latest',
    config: {
      systemInstruction: systemPrompt,
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
        // Initial greeting sent after session is fully initialized
        // Use setImmediate so session variable is assigned
        setImmediate(() => {
          try {
            session.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: 'Hi' }] }],
              turnComplete: true,
            });
          } catch (e) {
            console.warn('[gemini] Could not send initial greeting:', e.message);
          }
        });
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
            message: 'ROOMI ran into an issue. Tap to try again.',
          }));
        }
      },

      onclose: (event) => {
        console.log(`[gemini] Session closed — code: ${event?.code}, reason: ${event?.reason || 'none'}`);
        // Notify browser so it doesn't stay stuck in "listening"
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Voice session ended. Tap to start again.',
          }));
        }
      },
    },
  });

  return session;
}
