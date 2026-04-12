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
        // Send initial greeting so user hears ROOMI immediately
        try {
          session.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: 'Hi' }] }],
            turnComplete: true,
          });
        } catch (e) {
          console.warn('[gemini] Could not send initial greeting:', e.message);
        }
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

