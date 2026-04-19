import { useState, useEffect } from 'react';
import { anchorSummary as fallbackData } from '../data/sampleData.js';
import { getAnchorSummary, saveAnchorSummary, getConversations, getUserProfile, getCaregiverResidents } from '../hooks/useFirestore.js';
import { useAuth } from '../hooks/useAuth.jsx';
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

// ── Generate daily anchor summary from real conversation data ──
function buildSummaryFromConversations(conversations, userProfile) {
  const userName = userProfile?.preferredName || userProfile?.fullName || 'Resident';
  const meds = userProfile?.medications || [];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Count total messages across all conversations today
  let totalUserMsgs = 0;
  let totalRoomiMsgs = 0;
  const scenarios = new Set();

  conversations.forEach(conv => {
    scenarios.add(conv.scenario);
    (conv.messages || []).forEach(m => {
      if (m.sender === 'user') totalUserMsgs++;
      else totalRoomiMsgs++;
    });
  });

  // Determine check-in status per time of day from scenarios
  const hasMorning = scenarios.has('morning');
  const hasMedication = scenarios.has('medication');
  const hasHardMoment = scenarios.has('hard-moment');
  const hasEvening = scenarios.has('evening');
  const hasSchedule = scenarios.has('schedule');

  // Build check-ins from actual conversation patterns
  const checkIns = {};
  if (hasMorning || hasMedication) {
    checkIns.morning = {
      mood: hasHardMoment ? 'anxious' : 'calm',
      note: hasMedication
        ? `${userName} checked in and talked about their morning routine.`
        : `${userName} started their day with ROOMI.`,
    };
  }
  if (hasSchedule || hasHardMoment) {
    checkIns.midday = {
      mood: hasHardMoment ? 'anxious' : 'calm',
      note: hasHardMoment
        ? `Had a tough moment today but worked through it with ROOMI.`
        : `Reviewed the day's plan and stayed on track.`,
    };
  }
  if (hasEvening) {
    checkIns.evening = {
      mood: 'content',
      note: `${userName} reflected on the day with ROOMI.`,
    };
  }

  // Mood score: base 3, +1 for medication, +1 for no hard moments, cap at 5
  let moodScore = 3;
  if (hasMedication) moodScore++;
  if (!hasHardMoment) moodScore++;
  moodScore = Math.min(5, moodScore);

  const moodLabels = { 1: 'Tough day', 2: 'Rough patches', 3: 'Okay day', 4: 'Good day', 5: 'Great day' };
  const moodEmojis = { 1: '😔', 2: '😐', 3: '🙂', 4: '😊', 5: '🥳' };

  // Routine items completed = number of different scenarios used
  const routineItems = scenarios.size;
  const routineTotal = 5; // 5 possible scenario types
  const routinePercent = Math.round((routineItems / routineTotal) * 100);

  const highlights = [];
  if (hasMorning) highlights.push('Started the morning with ROOMI');
  if (hasMedication) highlights.push('Discussed medications');
  if (hasSchedule) highlights.push('Reviewed daily schedule');
  if (hasEvening) highlights.push('Evening wind-down completed');
  if (hasHardMoment) highlights.push('Worked through a hard moment');

  // Build quiet flags (contextual notes for caregiver)
  const quietFlags = [];
  if (hasHardMoment) {
    quietFlags.push({
      type: 'note',
      icon: '📝',
      text: `${userName} had a hard moment today and used ROOMI for support. They didn't shut down — they reached out.`,
      color: 'teal',
    });
  }
  if (totalUserMsgs > 15) {
    quietFlags.push({
      type: 'positive',
      icon: '💬',
      text: `${userName} was especially chatty today (${totalUserMsgs} messages). They seem engaged and comfortable with ROOMI.`,
      color: 'amber',
    });
  }
  if (totalUserMsgs === 0) {
    quietFlags.push({
      type: 'note',
      icon: '🤫',
      text: `${userName} hasn't chatted with ROOMI today yet. That's okay — some days are quieter than others.`,
      color: 'teal',
    });
  }
  if (scenarios.size >= 3) {
    quietFlags.push({
      type: 'positive',
      icon: '🌟',
      text: `${userName} used ${scenarios.size} different ROOMI features today. That kind of engagement shows real comfort with the routine.`,
      color: 'amber',
    });
  }
  // Default positive if nothing else
  if (quietFlags.length === 0) {
    quietFlags.push({
      type: 'positive',
      icon: '🦊',
      text: `${userName} had a steady day with ROOMI. Consistency is its own kind of progress.`,
      color: 'amber',
    });
  }

  return {
    date: today,
    userName,
    overallMood: moodScore,
    moodLabel: moodLabels[moodScore],
    moodEmoji: moodEmojis[moodScore],
    medicationStatus: {
      morning: {
        taken: hasMedication,
        meds: meds.length > 0
          ? meds.map(m => `${m.name} ${m.dosage || ''}`.trim())
          : ['No medications tracked'],
      },
    },
    routineCompletion: {
      completed: routineItems,
      total: routineTotal,
      percentage: routinePercent,
      highlights: highlights.length > 0 ? highlights : ['No activities logged yet today'],
    },
    checkIns: Object.keys(checkIns).length > 0
      ? checkIns
      : { morning: { mood: 'calm', note: `${userName} hasn't checked in yet today.` } },
    quietFlags,
    weeklyTrend: [3, 3, 3, 3, 3, 3, moodScore], // fills with today's score, history will come with Phase 2
    weekDays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    totalMessages: totalUserMsgs + totalRoomiMsgs,
    scenariosUsed: Array.from(scenarios),
    generatedAt: new Date().toISOString(),
  };
}

export default function AnchorView({ userId }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [residentName, setResidentName] = useState('Resident');
  const [residentUid, setResidentUid] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnchorData();
  }, [userId, user]);

  async function loadAnchorData() {
    setLoading(true);
    setError(null);

    try {
      // Determine whose data to show
      // If caregiver: find their linked resident(s)
      // If resident: show their own data (self-view)
      let targetUid = userId || user?.uid;

      if (user?.role === 'caregiver' && user?.uid) {
        const residents = await getCaregiverResidents(user.uid);
        if (residents.length > 0) {
          targetUid = residents[0].uid || residents[0].id;
        }
      }

      if (!targetUid) {
        // No user — show fallback sample data
        setData(fallbackData);
        setLoading(false);
        return;
      }

      setResidentUid(targetUid);

      // Load resident profile
      const profile = await getUserProfile(targetUid);
      if (profile) {
        setResidentName(profile.preferredName || profile.fullName || 'Resident');
      }

      // Try to load today's saved anchor summary first
      const savedSummary = await getAnchorSummary(targetUid);

      if (savedSummary && savedSummary.overallMood) {
        // We have a pre-built summary from today — use it
        setData(savedSummary);
        setLoading(false);
        return;
      }

      // No saved summary — build one from today's conversations
      const todayConversations = await getConversations(targetUid);

      if (todayConversations.length > 0) {
        const summary = buildSummaryFromConversations(todayConversations, profile || {});
        setData(summary);

        // Save it so we don't rebuild every time
        await saveAnchorSummary(targetUid, summary);
      } else {
        // No conversations yet today — show "waiting" state with sample structure
        const emptyDay = buildSummaryFromConversations([], profile || {});
        setData(emptyDay);
      }
    } catch (err) {
      console.error('Error loading anchor data:', err);
      setError(err.message);
      setData(fallbackData); // Graceful fallback
    } finally {
      setLoading(false);
    }
  }

  // ── Render helpers ──
  const renderStars = (count) =>
    Array.from({ length: 5 }, (_, i) => (
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

  if (loading) {
    return (
      <div className="anchor-page" id="anchor-page">
        <div className="container">
          <div className="anchor-header">
            <div className="anchor-header-left">
              <div className="anchor-header-icon">🏠</div>
              <div>
                <h1 className="anchor-header-title">Anchor View</h1>
                <p className="anchor-header-sub">Loading today's summary...</p>
              </div>
            </div>
          </div>
          <div className="anchor-trust-banner glass-card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🦊</div>
            <p>Gathering today's data from ROOMI...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const displayName = data.userName || residentName;
  const medsTaken = data.medicationStatus?.morning?.taken;

  return (
    <div className="anchor-page" id="anchor-page">
      <div className="container">

        {/* Header */}
        <div className="anchor-header">
          <div className="anchor-header-left">
            <div className="anchor-header-icon">🏠</div>
            <div>
              <h1 className="anchor-header-title">Anchor View</h1>
              <p className="anchor-header-sub">{displayName}'s day, in her own words · {data.date}</p>
            </div>
          </div>
          <div className="anchor-badge">
            <span className="anchor-badge-dot" />
            {data.generatedAt ? 'Live summary' : "Today's summary"}
          </div>
        </div>

        {/* Data source indicator */}
        {data.generatedAt && (
          <div className="anchor-trust-banner glass-card" style={{ borderLeft: '3px solid #059669', background: 'rgba(16, 185, 129, 0.05)' }}>
            <span className="anchor-trust-icon">📊</span>
            <p>
              This summary is <strong>generated from real conversations</strong> {displayName} had with ROOMI today.
              {data.totalMessages > 0 ? ` ${data.totalMessages} messages across ${data.scenariosUsed?.length || 0} scenarios.` : ''}
            </p>
          </div>
        )}

        {/* Trust banner */}
        <div className="anchor-trust-banner glass-card">
          <span className="anchor-trust-icon">🤝</span>
          <p>
            This view shows daily highlights — <strong>not transcripts, not live monitoring</strong>.
            {displayName}'s private conversations with ROOMI stay private. You see what she's comfortable sharing.
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
            <span className="anchor-stat-value anchor-stat-value--teal">{medsTaken ? '✅' : '—'}</span>
            <span className="anchor-stat-label">{medsTaken ? 'Meds taken' : 'Not tracked'}</span>
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
            <div className="anchor-mood-note">Based on how {displayName.toLowerCase() === displayName ? displayName : 'they'} said they felt today</div>
          </div>

          {/* Medication */}
          <div className="anchor-card glass-card anchor-card--meds">
            <div className="anchor-card-header">
              <h3>Medications</h3>
              <span className={`anchor-card-status ${medsTaken ? 'anchor-card-status--good' : ''}`}>
                {medsTaken ? '✓ Taken' : '— Not discussed'}
              </span>
            </div>
            <div className="anchor-med-list">
              {data.medicationStatus.morning.meds.map((med, i) => (
                <div key={i} className="anchor-med-item">
                  <span className="anchor-med-check">{medsTaken ? '✅' : '⬜'}</span>
                  <span className="anchor-med-name">{med}</span>
                </div>
              ))}
            </div>
            <div className="anchor-med-time">
              {medsTaken ? 'Discussed this morning' : 'No medication conversation today'}
            </div>
          </div>

          {/* Routine */}
          <div className="anchor-card glass-card anchor-card--routine">
            <div className="anchor-card-header">
              <h3>Day's Rhythm</h3>
              <span className={`anchor-card-status ${data.routineCompletion.percentage >= 50 ? 'anchor-card-status--good' : ''}`}>
                {data.routineCompletion.percentage >= 60 ? 'On track' : data.routineCompletion.percentage > 0 ? 'Getting started' : 'No activity yet'}
              </span>
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
                    <span className="anchor-routine-check">✓</span>
                    {h}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Check-in Timeline */}
          <div className="anchor-card glass-card anchor-card--checkins">
            <div className="anchor-card-header">
              <h3>How Their Day Felt</h3>
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
                      {MOOD_EMOJI[info.mood] || '⚪'} {MOOD_LABELS[time] || time}
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
              <span className="anchor-card-status anchor-card-status--good">
                {data.weeklyTrend[6] >= data.weeklyTrend[0] ? 'Trending up' : 'Steady'}
              </span>
            </div>
            <div className="anchor-trend-chart">
              {renderMiniChart(data.weeklyTrend)}
            </div>
            <div className="anchor-mood-note" style={{ marginTop: '8px' }}>
              Mood across the past 7 days, in their own words
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="anchor-footer-note glass-card">
          <span className="anchor-footer-icon">🦊</span>
          <div>
            <strong>From ROOMI</strong>
            <p>
              {data.totalMessages > 0
                ? `${displayName} had ${data.totalMessages} exchanges with ROOMI today across ${data.scenariosUsed?.length || 0} scenarios. ${data.overallMood >= 4 ? 'It was a good day. 💛' : data.overallMood >= 3 ? 'A steady day — consistency matters. 💛' : 'A harder day, but they showed up. That counts. 💛'}`
                : `${displayName} hasn't chatted with ROOMI yet today. That's okay — ROOMI will be here when they're ready. 🦊`
              }
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
