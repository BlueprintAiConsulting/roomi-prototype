import { anchorSummary } from '../data/sampleData.js';
import './AnchorView.css';

const MOOD_LABELS = {
  morning: 'Morning',
  midday: 'Midday',
  evening: 'Evening',
};

const MOOD_EMOJI = {
  calm: '🟢',
  anxious: '🟡',
  content: '🟢',
  stressed: '🟠',
};

export default function AnchorView() {
  const data = anchorSummary;

  const renderStars = (count) => Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={`star ${i < count ? 'star--filled' : ''}`}>★</span>
  ));

  const renderMiniChart = (values) => {
    const max = Math.max(...values);
    return (
      <div className="mini-chart">
        {values.map((v, i) => (
          <div key={i} className="mini-chart-col">
            <div 
              className="mini-chart-bar" 
              style={{ height: `${(v / max) * 100}%` }} 
              title={`${data.weekDays[i]}: ${v}/5`}
            />
            <span className="mini-chart-label">{data.weekDays[i]}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="anchor-page" id="anchor-page">
      <div className="container">
        {/* Header */}
        <div className="anchor-header">
          <div className="anchor-header-left">
            <div className="anchor-header-icon">🌠</div>
            <div>
              <h1 className="anchor-header-title">Anchor View</h1>
              <p className="anchor-header-sub">Cassie's day, in her own words · {data.date}</p>
            </div>
          </div>
          <div className="anchor-badge">
            <span className="anchor-badge-dot" /> Today's summary
          </div>
        </div>

        {/* Trust banner */}
        <div className="anchor-trust-banner glass-card">
          <span className="anchor-trust-icon">🤝</span>
          <p>
            This view shows daily highlights — <strong>not transcripts, not live monitoring</strong>. Cassie's private conversations with ROOMI stay private. You see what she's comfortable sharing.
          </p>
        </div>

        {/* Quick Stats Bar */}
        <div className="anchor-stats-bar glass-card">
          <div className="anchor-stat">
            <span className="anchor-stat-value">{data.routineCompletion.completed}<span className="anchor-stat-denom">/{data.routineCompletion.total}</span></span>
            <span className="anchor-stat-label">Items done</span>
          </div>
          <div className="anchor-stat-divider" />
          <div className="anchor-stat">
            <span className="anchor-stat-value anchor-stat-value--amber">{data.overallMood}<span className="anchor-stat-denom">★</span></span>
            <span className="anchor-stat-label">Mood today</span>
          </div>
          <div className="anchor-stat-divider" />
          <div className="anchor-stat">
            <span className="anchor-stat-value anchor-stat-value--teal">✅</span>
            <span className="anchor-stat-label">Meds taken</span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="anchor-grid">
          {/* Mood */}
          <div className="anchor-card glass-card anchor-card--mood">
            <div className="anchor-card-header">
              <h3>Today's Mood</h3>
              <span className="anchor-card-emoji">{data.moodEmoji}</span>
            </div>
            <div className="anchor-mood-stars">{renderStars(data.overallMood)}</div>
            <div className="anchor-mood-label">{data.moodLabel}</div>
            <div className="anchor-mood-note">Based on how she said she felt today</div>
          </div>

          {/* Medication */}
          <div className="anchor-card glass-card anchor-card--meds">
            <div className="anchor-card-header">
              <h3>Medications</h3>
              <span className="anchor-card-status anchor-card-status--good">✓ Taken</span>
            </div>
            <div className="anchor-med-list">
              {data.medicationStatus.morning.meds.map((med, i) => (
                <div key={i} className="anchor-med-item">
                  <span className="anchor-med-check">✅</span>
                  <span className="anchor-med-name">{med}</span>
                </div>
              ))}
            </div>
            <div className="anchor-med-time">
              Taken this morning
            </div>
          </div>

          {/* Routine */}
          <div className="anchor-card glass-card anchor-card--routine">
            <div className="anchor-card-header">
              <h3>Day’s Rhythm</h3>
              <span className="anchor-card-status anchor-card-status--good">On track</span>
            </div>
            <div className="anchor-routine-body">
              <div className="anchor-progress-ring">
                <svg viewBox="0 0 36 36" className="anchor-ring-svg">
                  <path className="anchor-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path 
                    className="anchor-ring-fill" 
                    strokeDasharray={`${data.routineCompletion.percentage}, 100`} 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  />
                </svg>
                <div className="anchor-ring-label">
                  <span className="anchor-ring-pct">{data.routineCompletion.percentage}%</span>
                  <span className="anchor-ring-sub">done</span>
                </div>
              </div>
              <div className="anchor-routine-highlights">
                {data.routineCompletion.highlights.map((h, i) => (
                  <div key={i} className="anchor-routine-highlight">
                    <span className="anchor-routine-check">✓</span> {h}
                  </div>
              ))}
              </div>
            </div>
          </div>

          {/* Check-in Timeline */}
          <div className="anchor-card glass-card anchor-card--checkins">
            <div className="anchor-card-header">
              <h3>How Her Day Felt</h3>
            </div>
            <div className="anchor-timeline">
              {Object.entries(data.checkIns).map(([time, info], i, arr) => (
                <div key={time} className="anchor-timeline-item">
                  <div className="anchor-timeline-dot-wrapper">
                    <div className={`anchor-timeline-dot anchor-timeline-dot--${info.mood}`} />
                    {i < arr.length - 1 && <div className="anchor-timeline-line" />}
                  </div>
                  <div className="anchor-timeline-content">
                    <div className="anchor-timeline-time">
                      {MOOD_EMOJI[info.mood] || '⚪️'} {MOOD_LABELS[time] || time}
                    </div>
                    <div className="anchor-timeline-note">{info.note}</div>
                  </div>
              </div>
            ))}
            </div>
          </div>

          {/* Notes / Flags */}
          <div className="anchor-card glass-card anchor-card--flags">
            <div className="anchor-card-header">
              <h3>Notes</h3>
              <span className="anchor-flags-note">context, not alarms</span>
            </div>
            <div className="anchor-flags-list">
              {data.quietFlags.map((flag, i) => (
                <div key={i} className={`anchor-flag anchor-flag--${flag.color}`}>
                  <span className="anchor-flag-icon">{flag.icon}</span>
                  <p className="anchor-flag-text">{flag.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Trend */}
          <div className="anchor-card glass-card anchor-card--trend">
            <div className="anchor-card-header">
              <h3>This Week</h3>
              <span className="anchor-card-status anchor-card-status--good">Trending up</span>
            </div>
            <div className="anchor-trend-chart">
              {renderMiniChart(data.weeklyTrend)}
            </div>
            <div className="anchor-mood-note" style={{ marginTop: '8px' }}>
              Mood across the past 7 days, in her own words
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="anchor-footer-note glass-card">
          <span className="anchor-footer-icon">🦊</span>
          <div>
            <strong>From ROOMI</strong>
            <p>Cassie had a solid day. She ran into something hard — and instead of shutting down, she chose to prepare. That's the kind of growth worth celebrating. 💛</p>
          </div>
        </div>
      </div>
    </div>
  );
}
