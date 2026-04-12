import { useState, useRef, useEffect, useCallback } from 'react';
import { createWorkletBlob } from '../micWorklet.js';
import './VoiceMode.css';


const VOICE_OPTIONS = [
  { id: 'Aoede', label: 'Aoede', desc: 'Warm · Clear' },
  { id: 'Kore',  label: 'Kore',  desc: 'Soft · Gentle' },
];

const WS_URL = import.meta.env.VITE_VOICE_WS_URL || 'ws://localhost:3001';
const GEMINI_SAMPLE_RATE = 24000; // Gemini Live outputs at 24kHz

export default function VoiceMode({ onExit, userName }) {
  const [selectedVoice, setSelectedVoice] = useState('Aoede');
  const [status, setStatus] = useState('idle'); // idle | connecting | listening | speaking | error
  const [transcript, setTranscript] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const workletNodeRef = useRef(null);
  const sourceRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const transcriptEndRef = useRef(null);
  const workletBlobUrlRef = useRef(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const stopMic = useCallback(() => {
    if (workletNodeRef.current) {
      try { workletNodeRef.current.disconnect(); } catch (_) {}
      workletNodeRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (_) {}
      sourceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (workletBlobUrlRef.current) {
      URL.revokeObjectURL(workletBlobUrlRef.current);
      workletBlobUrlRef.current = null;
    }
  }, []);

  const endSession = useCallback(() => {
    stopMic();
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (_) {}
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (_) {}
      audioContextRef.current = null;
    }
    setStatus('idle');
  }, [stopMic]);

  // Play a PCM16 chunk from Gemini (24kHz mono)
  const playAudioChunk = useCallback((arrayBuffer) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const int16 = new Int16Array(arrayBuffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, GEMINI_SAMPLE_RATE);
    audioBuffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + audioBuffer.duration;
  }, []);

  const startSession = useCallback(async () => {
    setStatus('connecting');
    setTranscript([]);
    setErrorMsg('');
    nextPlayTimeRef.current = 0;

    // Set up audio context for playback
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

    // Open WebSocket
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'init', voice: selectedVoice }));
    };

    ws.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Audio chunk from ROOMI
        setStatus('speaking');
        playAudioChunk(event.data);
        return;
      }

      const msg = JSON.parse(event.data);

      if (msg.type === 'ready') {
        setStatus('listening');
        // Start mic capture via AudioWorklet (more reliable than ScriptProcessor)
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
          micStreamRef.current = stream;

          const micCtx = new AudioContext();              // native rate (48000 in Chrome)
          const actualRate = micCtx.sampleRate;
          const blobUrl = createWorkletBlob();
          workletBlobUrlRef.current = blobUrl;

          await micCtx.audioWorklet.addModule(blobUrl);

          const source = micCtx.createMediaStreamSource(stream);
          const workletNode = new AudioWorkletNode(micCtx, 'mic-capture');

          workletNode.port.onmessage = (e) => {
            if (ws.readyState !== 1) return;
            // Resample from native rate to 16000 if needed
            const int16In = new Int16Array(e.data);
            if (actualRate === 16000) {
              ws.send(int16In.buffer);
            } else {
              // Simple linear downsample
              const ratio = actualRate / 16000;
              const outLen = Math.floor(int16In.length / ratio);
              const out = new Int16Array(outLen);
              for (let i = 0; i < outLen; i++) {
                out[i] = int16In[Math.floor(i * ratio)];
              }
              ws.send(out.buffer);
            }
          };

          source.connect(workletNode);
          workletNode.connect(micCtx.destination);

          sourceRef.current = source;
          workletNodeRef.current = workletNode;
        } catch (err) {
          setErrorMsg('Microphone access denied. Please allow mic access and try again.');
          setStatus('error');
          endSession();
        }
      }

      if (msg.type === 'transcript') {
        setTranscript(prev => [...prev, { speaker: msg.speaker, text: msg.text }]);
      }

      if (msg.type === 'turnComplete') {
        setStatus('listening');
      }

      if (msg.type === 'error') {
        setErrorMsg(msg.message);
        setStatus('error');
        endSession();
      }
    };

    ws.onerror = () => {
      setErrorMsg('Could not reach ROOMI. Check your connection and try again.');
      setStatus('error');
    };

    ws.onclose = () => {
      if (status !== 'idle') setStatus('idle');
    };
  }, [selectedVoice, playAudioChunk, endSession, status]);

  const STATUS_LABEL = {
    idle: null,
    connecting: 'Connecting to ROOMI…',
    listening: 'Listening…',
    speaking: 'ROOMI is speaking…',
    error: errorMsg || 'Something went wrong.',
  };

  const isActive = status !== 'idle';

  return (
    <div className="voice-mode" id="voice-mode">

      {/* Header */}
      <div className="voice-header">
        <div className="voice-header-id">
          <span className="voice-fox">🦊</span>
          <span className="voice-title">ROOMI Voice</span>
        </div>
        <button className="voice-exit-btn" onClick={() => { endSession(); onExit(); }}>
          Exit voice
        </button>
      </div>

      {/* Voice selector — only shown when idle */}
      {!isActive && (
        <div className="voice-selector">
          <div className="voice-selector-label">Choose ROOMI's voice</div>
          <div className="voice-selector-options">
            {VOICE_OPTIONS.map(v => (
              <button
                key={v.id}
                className={`voice-option ${selectedVoice === v.id ? 'voice-option--active' : ''}`}
                onClick={() => setSelectedVoice(v.id)}
              >
                <span className="voice-option-name">{v.label}</span>
                <span className="voice-option-desc">{v.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active voice badge */}
      {isActive && (
        <div className="voice-active-badge">
          <span className="voice-active-dot" />
          {selectedVoice} voice
        </div>
      )}

      {/* Mic visual */}
      <div className="voice-orb-container">
        <div className={`voice-orb voice-orb--${status}`}>
          {status === 'listening' && (
            <>
              <div className="voice-ring voice-ring--1" />
              <div className="voice-ring voice-ring--2" />
              <div className="voice-ring voice-ring--3" />
            </>
          )}
          {status === 'speaking' && (
            <div className="voice-waveform">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="voice-waveform-bar" style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          )}
          <span className="voice-orb-icon">
            {status === 'speaking' ? '🦊' : '🎙️'}
          </span>
        </div>
      </div>

      {/* Status label */}
      <div className={`voice-status-label voice-status-label--${status}`}>
        {STATUS_LABEL[status] || ''}
      </div>

      {/* CTA */}
      {!isActive && (
        <button className="btn btn-primary voice-start-btn" onClick={startSession}>
          Start talking to ROOMI
        </button>
      )}
      {isActive && status !== 'connecting' && (
        <button className="btn btn-secondary voice-end-btn" onClick={endSession}>
          End conversation
        </button>
      )}

      {/* Transcript */}
      {transcript.length > 0 && (
        <div className="voice-transcript">
          <div className="voice-transcript-label">Conversation</div>
          <div className="voice-transcript-list">
            {transcript.map((line, i) => (
              <div key={i} className={`voice-transcript-line voice-transcript-line--${line.speaker}`}>
                <span className="voice-transcript-speaker">
                  {line.speaker === 'roomi' ? '🦊 ROOMI' : `💬 ${userName || 'You'}`}
                </span>
                <span className="voice-transcript-text">{line.text}</span>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
