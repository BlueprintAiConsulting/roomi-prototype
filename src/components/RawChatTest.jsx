import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

const SYSTEM_PROMPT = `You are ROOMI, a warm and caring AI companion for people with intellectual and developmental disabilities. 
Be conversational, warm, simple, and supportive. Use short sentences. Use emojis occasionally. Never be clinical or robotic.
This is a live smoke test — respond naturally as ROOMI would in production.`;

// ─── Direct Gemini SDK (no server needed) ──
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

export default function RawChatTest({ onExit }) {
  const [messages, setMessages] = useState([
    { role: 'roomi', text: 'Hey! 🦊 This is ROOMI live test mode. Say anything to test the chat.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const history = [...messages, userMsg]
        .filter(m => m.role !== 'error')
        .map(m => ({
          role: m.role === 'roomi' ? 'model' : 'user',
          parts: [{ text: m.text }]
        }));

      if (!genai) {
        throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY.');
      }

      const response = await genai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: history,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.45,
          maxOutputTokens: 512,
          topP: 0.85,
        },
      });

      const reply = response?.text?.trim()
        || response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (reply) {
        setMessages(prev => [...prev, { role: 'roomi', text: reply }]);
      } else {
        throw new Error('No response from ROOMI');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a0a14', display: 'flex',
      flexDirection: 'column', fontFamily: 'Nunito, sans-serif', zIndex: 9999,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🦊</span>
          <span style={{ color: '#ffb300', fontWeight: 700, fontSize: '0.9rem' }}>ROOMI</span>
          <span style={{
            background: 'rgba(255,179,0,0.15)', color: '#ffb300',
            fontSize: '0.65rem', padding: '2px 8px', borderRadius: '20px',
            fontWeight: 600, letterSpacing: '0.06em',
          }}>LIVE TEST</span>
        </div>
        <button onClick={onExit} style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.5)', padding: '4px 12px', borderRadius: '6px',
          cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit',
        }}>Exit</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '75%', padding: '0.65rem 0.9rem', borderRadius: '14px',
              fontSize: '0.9rem', lineHeight: 1.5,
              background: m.role === 'user'
                ? 'rgba(255,179,0,0.2)'
                : 'rgba(255,255,255,0.07)',
              color: m.role === 'user' ? '#ffe082' : '#e8eaf6',
              borderBottomRightRadius: m.role === 'user' ? '4px' : '14px',
              borderBottomLeftRadius: m.role === 'roomi' ? '4px' : '14px',
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'rgba(255,255,255,0.07)', padding: '0.65rem 0.9rem',
              borderRadius: '14px 14px 14px 4px', color: 'rgba(255,255,255,0.4)',
              fontSize: '0.85rem',
            }}>
              ROOMI is typing…
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: '#ff6b6b', fontSize: '0.8rem', padding: '0.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.02)',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Send a message to test ROOMI…"
          style={{
            flex: 1, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
            padding: '0.65rem 1rem', color: '#fff', fontSize: '0.9rem',
            fontFamily: 'inherit', outline: 'none',
          }}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            background: input.trim() && !loading ? '#ffb300' : 'rgba(255,179,0,0.2)',
            border: 'none', borderRadius: '10px', padding: '0 1rem',
            color: input.trim() && !loading ? '#000' : 'rgba(255,255,255,0.2)',
            fontWeight: 700, fontSize: '0.9rem', cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'inherit', transition: 'all 0.2s', minWidth: '60px',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
