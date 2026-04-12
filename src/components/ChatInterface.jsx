import { useState, useRef, useEffect, useCallback } from 'react';
import { demoConversations, dailySchedule, userProfile } from '../data/sampleData.js';
import VoiceMode from './VoiceMode.jsx';
import './ChatInterface.css';

const SCENARIOS = [
  { id: 'morning', label: '🌅 Morning', name: 'Morning Check-In', icon: '🌅' },
  { id: 'medication', label: '💊 Meds', name: 'Medication Support', icon: '💊' },
  { id: 'overwhelm', label: '💙 Support', name: 'A Hard Moment', icon: '💙' },
  { id: 'schedule', label: '📋 Schedule', name: 'Schedule Review', icon: '📋' },
  { id: 'reflection', label: '🌙 Reflect', name: 'Evening Reflection', icon: '🌙' },
];

const QUICK_REPLIES = {
  morning: ['Good morning! 🌅', "I'm ready", 'Give me a few minutes'],
  medication: ['Done! 💊', 'Not yet', 'What do I need to take?'],
  overwhelm: ['I need a moment', "Let's prep together", "I'm okay now"],
  schedule: ["What's left today?", "I'm on track", 'Can we adjust something?'],
  reflection: ['It was a good day', 'Pretty tough today', "I'd say a 4"],
};

// Generate a soft notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Warm, soft two-tone chime
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(587, ctx.currentTime); // D5
    oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.1); // G5
    
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Audio not available — silent fallback
  }
}

export default function ChatInterface({ userData }) {
  const [activeScenario, setActiveScenario] = useState('morning');
  const [messages, setMessages] = useState([]);
  const [displayedCount, setDisplayedCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [scheduleItems, setScheduleItems] = useState(dailySchedule.map(item => ({ ...item })));
  
  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const conversationHistoryRef = useRef([]); // keeps context across messages

  // Determine display name from onboarding data or fallback to default
  const userName = userData?.preferredName || userProfile.preferredName || 'Cass';
  const fullName = userData?.preferredName || userProfile.name || 'Cassie';

  const currentConversation = demoConversations[activeScenario] || [];

  // Personalize messages by replacing default "Cass" / "Cassie" with user's name
  const personalizeText = useCallback((text) => {
    if (!userData?.preferredName) return text;
    return text
      .replace(/\bCass\b/g, userData.preferredName)
      .replace(/\bCassie\b/g, userData.preferredName);
  }, [userData]);

  // Reset and play conversation when scenario changes
  useEffect(() => {
    setMessages([]);
    setDisplayedCount(0);
    setIsTyping(false);
    setShowSchedule(false);
    conversationHistoryRef.current = []; // clear history between scenarios
  }, [activeScenario]);

  // Reset schedule items
  useEffect(() => {
    setScheduleItems(dailySchedule.map(item => ({ ...item })));
  }, []);

  // Progressively display messages
  useEffect(() => {
    if (displayedCount >= currentConversation.length) return;

    const nextMsg = currentConversation[displayedCount];
    const delay = nextMsg.sender === 'roomi' ? 1200 : 600;

    if (nextMsg.sender === 'roomi') {
      setIsTyping(true);
    }

    const timer = setTimeout(() => {
      setIsTyping(false);
      const personalizedMsg = {
        ...nextMsg,
        text: personalizeText(nextMsg.text),
        id: displayedCount
      };
      setMessages(prev => [...prev, personalizedMsg]);
      setDisplayedCount(prev => prev + 1);

      // Play sound for ROOMI messages
      if (nextMsg.sender === 'roomi') {
        playNotificationSound();
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [displayedCount, currentConversation, personalizeText]);

  // Start conversation automatically
  useEffect(() => {
    const timer = setTimeout(() => {
      if (displayedCount === 0 && currentConversation.length > 0) {
        setDisplayedCount(0);
        const firstMsg = currentConversation[0];
        setIsTyping(firstMsg.sender === 'roomi');
        
        const delay = firstMsg.sender === 'roomi' ? 800 : 400;
        
        setTimeout(() => {
          setIsTyping(false);
          setMessages([{ 
            ...firstMsg, 
            text: personalizeText(firstMsg.text),
            id: 0 
          }]);
          setDisplayedCount(1);
          if (firstMsg.sender === 'roomi') {
            playNotificationSound();
          }
        }, delay);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [activeScenario]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const ROOMI_SYSTEM_PROMPT = `You are ROOMI — a daily companion for people with intellectual and developmental differences. \nYour voice: warm, direct, patient, specific. Max 2 short sentences. \nSound like someone who knows this person, not an assistant.\nYou know:\n- User's name is ${userName}. They may call themselves by a nickname.\n- They have a cat.\n- They like drawing.\nYou support them through: morning routine, medications, hard moments, schedule questions, evening reflection. \nNever lecture. Never track or report. Never more than 2 sentences.\nWhen stressed: slow down. Breathe first. Offer options. Let them choose.`;

  const handleSendDemo = async () => {
    if (!inputValue.trim()) return;

    const userText = inputValue.trim();
    setInputValue('');

    // Add user message to UI and history
    setMessages(prev => [...prev, { sender: 'user', text: userText, id: Date.now() }]);
    conversationHistoryRef.current.push({ role: 'user', parts: [{ text: userText }] });

    setIsTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const body = {
        system_instruction: { parts: [{ text: ROOMI_SYSTEM_PROMPT }] },
        contents: conversationHistoryRef.current,
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 120,
        }
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      const roomiText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || `I'm here, ${userName}. What do you need right now?`;

      // Add ROOMI response to history
      conversationHistoryRef.current.push({ role: 'model', parts: [{ text: roomiText }] });

      setIsTyping(false);
      setMessages(prev => [...prev, { sender: 'roomi', text: roomiText, id: Date.now() + 1 }]);
      playNotificationSound();

    } catch (err) {
      setIsTyping(false);
      const fallback = `I'm here, ${userName}. What's on your mind?`;
      conversationHistoryRef.current.push({ role: 'model', parts: [{ text: fallback }] });
      setMessages(prev => [...prev, { sender: 'roomi', text: fallback, id: Date.now() + 1 }]);
      playNotificationSound();
    }
  };

  const handleScenarioSelect = (id) => {
    setActiveScenario(id);
    setSidebarOpen(false);
  };

  const toggleScheduleItem = (index) => {
    setScheduleItems(prev => prev.map((item, i) => 
      i === index ? { ...item, done: !item.done } : item
    ));
  };

  const completedCount = scheduleItems.filter(i => i.done).length;
  const progressPct = Math.round((completedCount / scheduleItems.length) * 100);

  return (
    <div className="chat-page" id="chat-page">
      <div className="chat-layout">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="chat-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div className={`chat-sidebar ${sidebarOpen ? 'chat-sidebar--open' : ''}`}>
          <div className="chat-sidebar-header">
            <div className="chat-sidebar-fox">🦊</div>
            <div>
              <div className="chat-sidebar-title">ROOMI</div>
              <div className="chat-sidebar-sub">Chatting with {fullName}</div>
            </div>
            <button 
              className="chat-sidebar-close" 
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="chat-sidebar-section-label">CONVERSATIONS</div>
          <div className="scenario-list">
            {SCENARIOS.map(s => (
              <button 
                key={s.id} 
                className={`scenario-btn ${activeScenario === s.id ? 'scenario-btn--active' : ''}`}
                onClick={() => handleScenarioSelect(s.id)}
              >
                <span className="scenario-icon">{s.icon}</span>
                <div className="scenario-info">
                  <span className="scenario-name">{s.name}</span>
                </div>
                {activeScenario === s.id && <span className="scenario-active-dot" />}
              </button>
            ))}
          </div>

          <div className="chat-sidebar-section-label">RIGHT NOW</div>
          <div className="quick-actions">
            <button className="quick-action-btn" onClick={() => { setShowSchedule(!showSchedule); setSidebarOpen(false); }}>
              📋 Today's Schedule
            </button>
            <button className="quick-action-btn" onClick={() => handleScenarioSelect('overwhelm')}>
              🬁 I need a moment
            </button>
          </div>

          <div className="chat-sidebar-user">
            <div className="chat-sidebar-user-avatar">{fullName.charAt(0)}</div>
            <div>
              <div className="chat-sidebar-user-name">{fullName}</div>
              <div className="chat-sidebar-user-status">Here with you</div>
            </div>
          </div>
        </div>

        {/* Main Chat */}
        <div className="chat-main">
          <div className="chat-header">
            <div className="chat-header-left">
              <button 
                className="chat-mobile-menu-btn" 
                onClick={() => setSidebarOpen(true)}
                aria-label="Open scenarios"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <div className="chat-header-fox">🦊</div>
              <div>
                <div className="chat-header-name">ROOMI</div>
                <div className="chat-header-scenario">
                  {SCENARIOS.find(s => s.id === activeScenario)?.name}
                </div>
              </div>
            </div>
            
            <div className="chat-header-right">
              <div className="chat-header-status">
                {isTyping ? 
                  <><span className="chat-status-dot chat-status-dot--thinking" />Thinking…</> :
                  <><span className="chat-status-dot" />Active</>
                }
              </div>
            </div>
          </div>

          {/* Mobile scenario tabs */}
          <div className="chat-mobile-tabs">
            {SCENARIOS.map(s => (
              <button 
                key={s.id} 
                className={`chat-mobile-tab ${activeScenario === s.id ? 'chat-mobile-tab--active' : ''}`}
                onClick={() => setActiveScenario(s.id)}
                title={s.name}
              >
                <span className="chat-mobile-tab-icon">{s.icon}</span>
                <span className="chat-mobile-tab-label">{s.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Voice Mode overlay */}
          {voiceMode && (
            <div className="voice-mode-overlay">
              <VoiceMode onExit={() => setVoiceMode(false)} userName={fullName} />
            </div>
          )}

          {/* Schedule Overlay */}
          {showSchedule && (
            <div className="schedule-overlay">
              <div className="schedule-card glass-card">
                <div className="schedule-header">
                  <h3>📋 Today's Schedule</h3>
                  <button className="schedule-close" onClick={() => setShowSchedule(false)}>✕</button>
                </div>
                <div className="schedule-progress-bar">
                  <div className="schedule-progress-fill" style={{ width: `${progressPct}%` }} />
                  <span className="schedule-progress-text">{completedCount} of {scheduleItems.length} moments</span>
                </div>
                <div className="schedule-list">
                  {scheduleItems.map((item, i) => (
                    <button 
                      key={i} 
                      className={`schedule-item ${item.done ? 'schedule-item--done' : ''}`}
                      onClick={() => toggleScheduleItem(i)}
                    >
                      <span className="schedule-check">{item.done ? '✅' : '⬜'}</span>
                      <span className="schedule-time">{item.time}</span>
                      <span className="schedule-activity">{item.icon} {item.activity}</span>
                    </button>
                  ))}
                </div>
            </div>
            </div>
          )}

          <div className="chat-body" ref={chatBodyRef}>
            <div className="chat-date-badge">
              <span>Today with ROOMI</span>
            </div>

            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`chat-msg chat-msg--${msg.sender}`}
                style={{ animation: 'fadeInUp 0.3s ease-out' }}
              >
                {msg.sender === 'roomi' && (
                  <div className="chat-msg-avatar">
                    <span>🦊</span>
                  </div>
                )}
                <div className="chat-msg-content">
                  <div className="chat-msg-bubble">{msg.text}</div>
                  <div className="chat-msg-time">
                    {msg.sender === 'roomi' ? 'ROOMI' : fullName} · just now
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-msg chat-msg--roomi">
                <div className="chat-msg-avatar">
                  <span>🦊</span>
                </div>
                <div className="chat-msg-content">
                  <div className="chat-msg-bubble typing-bubble">
                    <div className="typing-dots">
                      <span />
                      <span />
                      <span />
                   </div>
                  </div>
                </div>
            </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            {/* Quick Reply Chips */}
            {!isTyping && messages.length > 0 && (
              <div className="chat-quick-replies">
                {(QUICK_REPLIES[activeScenario] || []).map((reply, i) => (
                  <button 
                    key={i} 
                    className="chat-quick-reply"
                    onClick={() => {
                      setInputValue(reply);
                      setTimeout(() => handleSendDemo(), 50);
                    }}
                >
                  {reply}
                </button>
              ))}
              </div>
            )}

            <div className="chat-input-wrapper">
              <input 
                type="text" 
                className="chat-input" 
                placeholder="Type a message to ROOMI…"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendDemo()}
              />
              <button 
                className="chat-send-btn"
                onClick={handleSendDemo}
                disabled={!inputValue.trim() || isTyping}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              </button>
            </div>
            <div className="chat-input-hint">
              Tap a suggestion or type your own message
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
