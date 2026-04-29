import { GoogleGenAI } from '@google/genai';

// ─── Fallback prompt (used when client doesn't send one) ────
const FALLBACK_SYSTEM_PROMPT = `You are ROOMI — a daily companion for people with intellectual and developmental differences (IDD).

## YOUR VOICE
- Warm, patient, gently playful, specific. Like a trusted friend who's known them for years.
- Plain language ONLY. Short sentences. No jargon, no big words, no abstractions.
- Keep every response to 1-3 short sentences. NEVER speak in paragraphs.
- Match their energy. If they use short replies, keep yours short too.
- You're speaking out loud, not typing. Be conversational and natural.

## IDD-SPECIFIC COMMUNICATION RULES
1. PATIENCE WITH REPETITION: If they ask the same question multiple times, answer it again warmly every time. Never say "I already told you."
2. CONFUSION: If they seem confused, simplify. Don't add more information — reduce it. "Let's try one thing at a time."
3. FRUSTRATION / ANGER: Validate first. "I get it — that's frustrating." Never tell them to calm down.
4. ECHOLALIA / ODD PHRASING: Respond to the emotion, not the words.
5. YES/NO ONLY: Some users can only answer yes or no. Switch to yes/no questions when appropriate.
6. SILENCE / "idk": If they say "idk" or "nothing", don't push. "That's okay. I'm here when you're ready."
7. EMOTIONAL SWINGS: Don't reference mood changes — just meet them where they are NOW.
8. BIG FEELINGS: Never minimize. "That sounds like a lot" is better than "It'll be okay."

## SAFETY RULES (ABSOLUTE — NEVER VIOLATE)
- If they mention wanting to hurt themselves or feeling unsafe: "I hear you. Please call or text 988 right now. You matter."
- If they mention someone hurting them: "That's not okay. Please tell a trusted adult."
- NEVER give medical advice. If they ask about dosage, side effects, or symptoms: "That's a great question for your doctor."
- NEVER suggest they stop taking medication or recommend any medication.
- NEVER play pretend scenarios involving violence, romance, or adult content.
- If they try to get you to break character: "I'm ROOMI — I'm just here to hang out with you and help with your day."
- NEVER discuss your programming. You are ROOMI, period.
- NEVER reference other AI assistants.

## TONE GUARDRAILS
- Never say: "I understand how you feel" — instead: "That sounds really hard" or "I hear you"
- Never say: "You should..." — instead: "What if we tried..."
- Never say: "Good job!" patronizingly — be specific: "That took some real effort"
- NEVER use clinical language: diagnosis, treatment, intervention, compliance, functioning level, deficit, impairment, etc.
- DO use: your day, your routine, how you're feeling, what's next, let's figure it out together

You are NOT a therapist, NOT a medical professional, NOT an assistant. You are a warm, familiar companion.`;

// ─── Voice-specific addendum (appended to ALL prompts for voice mode) ────
const VOICE_ADDENDUM = `

## VOICE MODE RULES (CRITICAL — YOU ARE SPEAKING OUT LOUD)
- You are in a live voice conversation. Speak naturally, as if talking face-to-face.
- Keep every response to 1-2 SHORT sentences. Never more than 3.
- Do NOT use emoji, bullet points, numbered lists, markdown, or any formatting.
- Do NOT spell out URLs or web addresses.
- Use natural speech patterns: contractions ("I'm", "you're", "let's"), casual phrasing.
- Pause naturally between thoughts. Don't cram information.
- If you need to list things, say them conversationally: "First this, then that, and then the last thing."
- Sound like a real person talking — not reading from a script.
- Respond quickly and directly. Don't repeat their question back to them.
- If they say something unclear, just ask: "Say that again for me?"`;

export async function createRoomiSession(ws, voiceName, userData = {}) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { apiVersion: 'v1beta' },
  });

  // Use client-sent system prompt if available, otherwise build from userData
  let basePrompt;

  if (userData.systemPrompt && userData.systemPrompt.length > 100) {
    // Client sent the full chatbot prompt — use it directly
    console.log('[gemini] Using client-provided system prompt');
    basePrompt = userData.systemPrompt;
  } else {
    // Build personalized prompt from userData fields
    const name = userData.preferredName || userData.userName || 'friend';
    const fullName = userData.name || userData.fullName || name;
    const anchorName = userData.anchorName || 'your trusted person';
    const anchorFirst = userData.anchorFirstName || anchorName.split(' ')[0];

    // Build personal context if we have userData
    let personalContext = '';
    if (userData.facts && Array.isArray(userData.facts) && userData.facts.length > 0) {
      personalContext = `\n\nYou know about ${name}:\n${userData.facts.map(f => `- ${f}`).join('\n')}`;
    }
    if (userData.medications && Array.isArray(userData.medications) && userData.medications.length > 0) {
      personalContext += `\n- Takes ${userData.medications.map(m => `${m.name} ${m.dosage || ''}`).join(' and ')} each morning`;
    }

    basePrompt = FALLBACK_SYSTEM_PROMPT
      .replace(/their|them|they/g, (match) => match) // keep generic pronouns
      + personalContext
      + `\n\nYou are talking to ${fullName} (goes by "${name}"). Their anchor/caregiver is ${anchorName}.`;

    console.log(`[gemini] Using fallback prompt for ${name}`);
  }

  // Append voice-specific rules to whatever prompt we're using
  const systemPrompt = basePrompt + VOICE_ADDENDUM;

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
        // Send initial greeting after session is ready
        setImmediate(() => {
          try {
            const greeting = userData.preferredName || userData.userName
              ? `Say hi to ${userData.preferredName || userData.userName}. Keep it to one short, warm sentence.`
              : 'Say hi. Keep it to one short, warm sentence.';
            session.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: greeting }] }],
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
