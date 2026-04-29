import { useState, useEffect, useRef } from 'react';
import { anchorSummary as fallbackData } from '../data/sampleData.js';
import {
  getAnchorSummary, saveAnchorSummary,
  getConversations, getUserProfile, getCaregiverResidents,
  getWeeklyAnchorHistory, getFirestoreEngagement, getFirestoreSafetyEvents,
} from '../hooks/useFirestore.js';
import { onSnapshot, doc, db } from '../firebase.js';
import './AnchorView.css';

const MOOD_LABELS = { morning: 'Morning', midday: 'Midday', evening: 'Evening' };
const MOOD_EMOJI  = { calm: '🟢', anxious: '🟡', content: '🟢', stressed: '🟠' };

// ── Build daily summary from real conversations ──
function buildSummaryFromConversations(conversations, userProfile) {
  const userName = userProfile?.preferredName || userProfile?.fullName || 'Resident';
  const meds = userProfile?.medications || [];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  let totalUserMsgs = 0, totalRoomiMsgs = 0;
  const scenarios = new Set();

  conversations.forEach(conv => {
    scenarios.add(conv.scenario);
    (conv.messages || []).forEach(m => {
      if (m.sender === 'user') totalUserMsgs++; else totalRoomiMsgs++;
    });
  });

  // Extract mood self-rating from evening scenario messages (1-5)
  let selfRating = null;
  const eveningConv = conversations.find(c => c.scenario === 'evening');
  if (eveningConv) {
    const msgs = eveningConv.messages || [];
    for (const m of msgs) {
      if (m.sender === 'user') {
        const match = m.text?.match(/\b([1-5])\b/);
        if (match) selfRating = parseInt(match[1]);
      }
    }
  }

  const hasMorning   = scenarios.has('morning');
  const hasMedication = scenarios.has('medication');
  const hasHardMoment = scenarios.has('hard-moment');
  const hasEvening   = scenarios.has('evening');
  const hasSchedule  = scenarios.has('schedule');

  const checkIns = {};
  if (hasMorning || hasMedication) checkIns.morning = {
    mood: hasHardMoment ? 'anxious' : 'calm',
    note: hasMedication ? `${userName} checked in and talked about their morning routine.` : `${userName} started their day with ROOMI.`,
  };
  if (hasSchedule || hasHardMoment) checkIns.midday = {
    mood: hasHardMoment ? 'anxious' : 'calm',
    note: hasHardMoment ? 'Had a tough moment today but worked through it with ROOMI.' : "Reviewed the day's plan and stayed on track.",
  };
  if (hasEvening) checkIns.evening = {
    mood: 'content',
    note: `${userName} reflected on the day with ROOMI.${selfRating ? ` Rated the day ${selfRating}/5.` : ''}`,
  };

  let moodScore = selfRating ?? 3;
  if (!selfRating) {
    if (hasMedication) moodScore++;
    if (!hasHardMoment) moodScore++;
    moodScore = Math.min(5, moodScore);
  }

  const moodLabels = { 1: 'Tough day', 2: 'Rough patches', 3: 'Okay day', 4: 'Good day', 5: 'Great day' };
  const moodEmojis = { 1: '😔', 2: '😐', 3: '🙂', 4: '😊', 5: '🥳' };

  const routineItems = scenarios.size;
  const routineTotal = 5;
  const routinePercent = Math.round((routineItems / routineTotal) * 100);

  const highlights = [];
  if (hasMorning)    highlights.push('Started the morning with ROOMI');
  if (hasMedication) highlights.push('Discussed medications');
  if (hasSchedule)   highlights.push('Reviewed daily schedule');
  if (hasEvening)    highlights.push('Evening wind-down completed');
  if (hasHardMoment) highlights.push('Worked through a hard moment');

  const quietFlags = [];
  if (hasHardMoment) quietFlags.push({ type: 'note', icon: '📝', text: `${userName} had a hard moment today and used ROOMI for support. They didn't shut down — they reached out.`, color: 'teal' });
  if (totalUserMsgs > 15) quietFlags.push({ type: 'positive', icon: '💬', text: `${userName} was especially chatty today (${totalUserMsgs} messages). They seem engaged and comfortable with ROOMI.`, color: 'amber' });
  if (totalUserMsgs === 0) quietFlags.push({ type: 'note', icon: '🤫', text: `${userName} hasn't chatted with ROOMI today yet. That's okay — some days are quieter than others.`, color: 'teal' });
  if (scenarios.size >= 3) quietFlags.push({ type: 'positive', icon: '🌟', text: `${userName} used ${scenarios.size} different ROOMI features today. That kind of engagement shows real comfort with the routine.`, color: 'amber' });
  if (quietFlags.length === 0) quietFlags.push({ type: 'positive', icon: '🦊', text: `${userName} had a steady day with ROOMI. Consistency is its own kind of progress.`, color: 'amber' });

  return {
    date: today, userName, overallMood: moodScore,
    moodLabel: moodLabels[moodScore], moodEmoji: moodEmojis[moodScore],
    medicationStatus: { morning: { taken: hasMedication, meds: meds.length > 0 ? meds.map(m => `${m.name} ${m.dosage || ''}`.trim()) : ['No medications tracked'] } },
    routineCompletion: { completed: routineItems, total: routineTotal, percentage: routinePercent, highlights: highlights.length > 0 ? highlights : ['No activities logged yet today'] },
    checkIns: Object.keys(checkIns).length > 0 ? checkIns : { morning: { mood: 'calm', note: `${userName} hasn't checked in yet today.` } },
    quietFlags,
    weeklyTrend: [3, 3, 3, 3, 3, 3, moodScore],
    weekDays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    totalMessages: totalUserMsgs + totalRoomiMsgs,
    scenariosUsed: Array.from(scenarios),
    generatedAt: new Date().toISOString(),
  };
}

export default function AnchorView({ userId, isCaregiver }) {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [residentName, setResidentName] = useState('Resident');
  const [residentUid, setResidentUid]  = useState(null);
  const [weekHistory, setWeekHistory]  = useState([]);
  const [engagementData, setEngagementData] = useState(null);
  const [safetyEvents, setSafetyEvents]     = useState(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    loadAnchorData();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [userId, isCaregiver]);

  async function loadAnchorData() {
    setLoading(true);
    try {
      let targetUid = userId;

      // Caregivers: find their linked resident
      if (isCaregiver && userId) {
        const residents = await getCaregiverResidents(userId);
        if (residents.length > 0) targetUid = residents[0].uid || residents[0].id;
      }

      if (!targetUid) { setData(fallbackData); setLoading(false); return; }

      setResidentUid(targetUid);
      const profile = await getUserProfile(targetUid);
      if (profile) setResidentName(profile.preferredName || profile.fullName || 'Resident');

      // Try saved summary first
      const saved = await getAnchorSummary(targetUid);
      if (saved?.overallMood) {
        setData(saved);
        setLoading(false);
      } else {
        // Build from today's conversations
        const convs = await getConversations(targetUid);
        const summary = buildSummaryFromConversations(convs, profile || {});
        setData(summary);
        if (convs.length > 0) await saveAnchorSummary(targetUid, summary);
        setLoading(false);
      }

      // Live listener on today's anchor summary
      if (db) {
        const today = new Date().toISOString().split('T')[0];
        const docRef = doc(db, 'anchorSummaries', `${targetUid}_${today}`);
        if (unsubRef.current) unsubRef.current();
        unsubRef.current = onSnapshot(docRef, snap => {
          if (snap.exists()) setData(snap.data());
        }, () => {});
      }

      // Load supporting data in background
      loadSupportingData(targetUid);

    } catch (err) {
      console.error('Anchor load error:', err);
      setData(fallbackData);
      setLoading(false);
    }
  }

  async function loadSupportingData(uid) {
    const [history, engagement, safety] = await Promise.all([
      getWeeklyAnchorHistory(uid, 7),
      getFirestoreEngagement(uid, 7),
      getFirestoreSafetyEvents(uid, 7),
    ]);

    if (history.length > 0) {
      setWeekHistory(history);
      // Patch weeklyTrend with real data
      const trend = history.map(h => h.overallMood || 3);
      while (trend.length < 7) trend.unshift(3);
      setData(prev => prev ? { ...prev, weeklyTrend: trend.slice(-7) } : prev);
    }

    const hasEngagement = engagement.some(d => d.turns > 0);
    if (hasEngagement) setEngagementData(engagement);
    setSafetyEvents(safety);
  }

  // Render helpers
  const renderStars = (count) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`star ${i < count ? 'star--filled' : ''}`}>★</span>
    ));

  const renderMiniChart = (values, days) => {
    const max = Math.max(...values, 1);
    const labels = days || ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return (
      <div className="mini-chart">
        {values.map((v, i) => (
          <div key={i} className="mini-chart-col">
            <div className="mini-chart-bar" style={{ height: `${(v / max) * 100}%` }} title={`${labels[i]}: ${v}/5`} />
            <span className="mini-chart-label">{labels[i]}</span>
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
                <p className="anchor-header-sub">Loading today's summary…</p>
              </div>
            </div>
          </div>
          <div className="anchor-trust-banner glass-card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🦊</div>
            <p>Gathering today's data from ROOMI…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const displayName = data.userName || residentName;
  const medsTaken = data.medicationStatus?.morning?.taken;

  // Build chart labels from real history dates
  const chartLabels = weekHistory.length > 0
    ? weekHistory.map(h => new Date(h.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' }))
    : (data.weekDays || ['M', 'T', 'W', 'T', 'F', 'S', 'S']);

  return (
    <div className="anchor-page" id="anchor-page">
      <div className="container">

        {/* Header */}
        <div className="anchor-header">
          <div className="anchor-header-left">
            <div className="anchor-header-icon">🏠</div>
            <div>
              <h1 className="anchor-header-title">Anchor View</h1>
              <p className="anchor-header-sub">{displayName}'s day · {data.date}</p>
            </div>
          </div>
          <div className="anchor-badge">
            <span className="anchor-badge-dot" />
            {data.generatedAt ? 'Live summary' : "Today's summary"}
          </div>
        </div>

        {/* Data source banner */}
        {data.generatedAt && (
          <div className="anchor-trust-banner glass-card" style={{ borderLeft: '3px solid #059669', background: 'rgba(16,185,129,0.05)' }}>
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
            {displayName}'s private conversations with ROOMI stay private. You see what they're comfortable sharing.
          </p>
        </div>

        {/* Quick Stats */}
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
          <div className="anchor-stat-divider" />
          <div className="anchor-stat">
            <span className="anchor-stat-value">{data.totalMessages || 0}</span>
            <span className="anchor-stat-label">Messages</span>
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
            <div className="anchor-mood-note">
              {data.scenariosUsed?.includes('evening') ? 'Self-rated by resident' : 'Inferred from conversation patterns'}
            </div>
          </div>

          {/* Medications */}
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
                  <path className="anchor-ring-fill" strokeDasharray={`${data.routineCompletion.percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="anchor-ring-label">
                  <span className="anchor-ring-pct">{data.routineCompletion.percentage}%</span>
                  <span className="anchor-ring-sub">done</span>
                </div>
              </div>
              <div className="anchor-routine-highlights">
                {data.routineCompletion.highlights.map((h, i) => (
                  <div key={i} className="anchor-routine-highlight">
                    <span className="anchor-routine-check">✓</span>{h}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Check-in Timeline */}
          <div className="anchor-card glass-card anchor-card--checkins">
            <div className="anchor-card-header"><h3>How Their Day Felt</h3></div>
            <div className="anchor-timeline">
              {Object.entries(data.checkIns).map(([time, info], i, arr) => (
                <div key={time} className="anchor-timeline-item">
                  <div className="anchor-timeline-dot-wrapper">
                    <div className={`anchor-timeline-dot anchor-timeline-dot--${info.mood}`} />
                    {i < arr.length - 1 && <div className="anchor-timeline-line" />}
                  </div>
                  <div className="anchor-timeline-content">
                    <div className="anchor-timeline-time">{MOOD_EMOJI[info.mood] || '⚪'} {MOOD_LABELS[time] || time}</div>
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

          {/* Weekly Trend — real history when available */}
          <div className="anchor-card glass-card anchor-card--trend">
            <div className="anchor-card-header">
              <h3>This Week</h3>
              <span className="anchor-card-status anchor-card-status--good">
                {weekHistory.length > 1 ? `${weekHistory.length} days tracked` : data.weeklyTrend[6] >= data.weeklyTrend[0] ? 'Trending up' : 'Steady'}
              </span>
            </div>
            <div className="anchor-trend-chart">
              {renderMiniChart(data.weeklyTrend, chartLabels)}
            </div>
            <div className="anchor-mood-note" style={{ marginTop: '8px' }}>
              {weekHistory.length > 1 ? 'Mood scores from actual daily summaries' : 'Mood across the past 7 days'}
            </div>
          </div>
        </div>

        {/* Analytics Dashboard — only shown when Firestore data exists */}
        {(engagementData || safetyEvents) && (
          <>
            <div className="anchor-analytics-divider">
              <span className="anchor-analytics-divider-text">📊 Analytics Dashboard</span>
            </div>

            <div className="anchor-grid">
              {engagementData && (
                <div className="anchor-card glass-card anchor-card--engagement">
                  <div className="anchor-card-header">
                    <h3>7-Day Engagement</h3>
                    <span className="anchor-card-status anchor-card-status--good">
                      {engagementData.reduce((s, d) => s + d.turns, 0)} total turns
                    </span>
                  </div>
                  <div className="anchor-engagement-chart">
                    {engagementData.map((day, i) => {
                      const maxTurns = Math.max(...engagementData.map(d => d.turns), 1);
                      const pct = (day.turns / maxTurns) * 100;
                      const label = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                      return (
                        <div key={i} className="anchor-engagement-col">
                          <div className="anchor-engagement-value">{day.turns}</div>
                          <div className="anchor-engagement-bar-wrapper">
                            <div className={`anchor-engagement-bar ${day.turns === 0 ? 'anchor-engagement-bar--empty' : ''}`} style={{ height: `${Math.max(pct, 4)}%` }} />
                          </div>
                          <div className="anchor-engagement-label">{label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {safetyEvents && safetyEvents.length > 0 ? (
                <div className="anchor-card glass-card anchor-card--safety">
                  <div className="anchor-card-header">
                    <h3>Safety Interceptions</h3>
                    <span className="anchor-card-status">{safetyEvents.length} events</span>
                  </div>
                  <div className="anchor-safety-list">
                    {safetyEvents.slice(0, 5).map((evt, i) => (
                      <div key={i} className="anchor-safety-item">
                        <span className={`anchor-safety-layer anchor-safety-layer--${evt.layer}`}>L{evt.layer}</span>
                        <span className="anchor-safety-category">{evt.category}</span>
                        <span className="anchor-safety-time">
                          {evt.timestamp?.toDate ? evt.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : evt.date || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="anchor-mood-note" style={{ marginTop: '8px' }}>Safety layers working as designed</div>
                </div>
              ) : safetyEvents && (
                <div className="anchor-card glass-card anchor-card--safety">
                  <div className="anchor-card-header">
                    <h3>Safety Status</h3>
                    <span className="anchor-card-status anchor-card-status--good">All clear</span>
                  </div>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛡️</div>
                    <div className="anchor-mood-note">No safety events in the last 7 days.</div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
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
