// FeedbackButtons.jsx — Thumbs up/down rating widget for ROOMI responses
import { useState, useEffect } from 'react';
import { logFeedback } from '../hooks/useFirestore.js';
import './FeedbackButtons.css';

export default function FeedbackButtons({ userId, scenario, turn, msgText, msgId }) {
  const [rating, setRating] = useState(null); // null | 'up' | 'down'
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fade in 900ms after message renders
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, []);

  const handleRate = async (value) => {
    if (rating || saving) return;
    setSaving(true);
    setRating(value);

    await logFeedback(userId, {
      scenario,
      turn,
      rating: value,
      msgSnippet: msgText,
    });

    setSaving(false);
  };

  return (
    <div
      className={`feedback-buttons ${visible ? 'feedback-buttons--visible' : ''} ${rating ? 'feedback-buttons--rated' : ''}`}
      aria-label="Rate this response"
    >
      <button
        className={`feedback-btn feedback-btn--up ${rating === 'up' ? 'feedback-btn--selected' : ''} ${rating && rating !== 'up' ? 'feedback-btn--dimmed' : ''}`}
        onClick={() => handleRate('up')}
        disabled={!!rating}
        aria-label="This was helpful"
        title="Helpful"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>
      </button>

      <button
        className={`feedback-btn feedback-btn--down ${rating === 'down' ? 'feedback-btn--selected' : ''} ${rating && rating !== 'down' ? 'feedback-btn--dimmed' : ''}`}
        onClick={() => handleRate('down')}
        disabled={!!rating}
        aria-label="This wasn't helpful"
        title="Not helpful"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
          <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
        </svg>
      </button>

      {rating && (
        <span className="feedback-thanks" aria-live="polite">
          {rating === 'up' ? 'Thanks!' : 'Got it'}
        </span>
      )}
    </div>
  );
}
