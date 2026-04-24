// NotifSettings.jsx — Notification settings panel for ROOMI Founder Hub
// Renders as a dedicated Hub tab content area

import { useState } from 'react';
import { usePushNotifications, HUB_EVENT, DEFAULT_NOTIF_PREFS } from '../hooks/usePushNotifications.js';
import './NotifSettings.css';

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i < 12 ? 'AM' : 'PM';
  const h    = i % 12 === 0 ? 12 : i % 12;
  return { value: i, label: `${h}:00 ${ampm}` };
});

const EVENT_TOGGLES = [
  { key: HUB_EVENT.CHAT_MESSAGE,  icon: '💬', label: 'Founders Room',   sub: 'New messages in #founders chat' },
  { key: HUB_EVENT.ACTION_ITEM,   icon: '✅', label: 'Action Items',    sub: 'When a task is created or updated' },
  { key: HUB_EVENT.DECISION,      icon: '📋', label: 'Decisions',       sub: 'New council decisions logged' },
  { key: HUB_EVENT.MEETING,       icon: '📅', label: 'Meetings',        sub: 'Meeting scheduled or updated' },
  { key: HUB_EVENT.DOCUMENT,      icon: '📄', label: 'Documents',       sub: 'New file uploaded to Hub' },
  { key: HUB_EVENT.PILOT,         icon: '🧪', label: 'Pilots',          sub: 'Pilot program updates' },
  { key: HUB_EVENT.FUNDING,       icon: '💰', label: 'Funding',         sub: 'GoFundMe or funding updates' },
];

export default function NotifSettings({ userId }) {
  const {
    permission,
    isSupported,
    isGranted,
    isDenied,
    fcmToken,
    prefs,
    requestPermission,
    updatePref,
    sendTestNotification,
  } = usePushNotifications(userId);

  const [requesting, setRequesting] = useState(false);
  const [testSent, setTestSent]     = useState(false);

  const handleEnable = async () => {
    setRequesting(true);
    await requestPermission();
    setRequesting(false);
  };

  const handleTest = async () => {
    await sendTestNotification();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  if (!isSupported) {
    return (
      <div className="hub-empty">
        <div className="hub-empty-icon">🔕</div>
        <p className="hub-empty-title">Not Supported</p>
        <p className="hub-empty-text">
          Push notifications aren't available in this browser. Try Chrome, Edge, or Firefox on desktop or Android.
        </p>
      </div>
    );
  }

  return (
    <div className="notif-panel">

      {/* ── Permission Banner ── */}
      {!isGranted && !isDenied && (
        <div className="notif-permission-banner notif-permission-banner--default">
          <div className="notif-permission-icon">🔔</div>
          <div className="notif-permission-body">
            <p className="notif-permission-title">Enable Hub Notifications</p>
            <p className="notif-permission-desc">
              Stay in sync with your co-founders. Get instant alerts for new messages, action items, and key decisions — even when the tab is closed.
            </p>
          </div>
          <button className="notif-enable-btn" onClick={handleEnable} disabled={requesting}>
            {requesting ? 'Enabling…' : 'Enable Notifications'}
          </button>
        </div>
      )}

      {isGranted && (
        <div className="notif-permission-banner notif-permission-banner--granted">
          <div className="notif-permission-icon">✅</div>
          <div className="notif-permission-body">
            <p className="notif-permission-title">Notifications Active</p>
            <p className="notif-permission-desc">
              You're receiving Hub notifications. Customize which events alert you below.
            </p>
          </div>
          <button className="notif-test-btn" onClick={handleTest} disabled={testSent}>
            {testSent ? 'Sent! ✓' : '📨 Send Test'}
          </button>
        </div>
      )}

      {isDenied && (
        <div className="notif-permission-banner notif-permission-banner--denied">
          <div className="notif-permission-icon">🚫</div>
          <div className="notif-permission-body">
            <p className="notif-permission-title">Notifications Blocked</p>
            <p className="notif-permission-desc">
              You've blocked notifications for this site. To re-enable: click the lock icon in your browser address bar → Notifications → Allow.
            </p>
          </div>
        </div>
      )}

      {/* ── Event Toggles ── */}
      <p className="notif-section-title">Notify Me When…</p>
      <div className="notif-toggle-list">
        {EVENT_TOGGLES.map(({ key, icon, label, sub }) => (
          <div className="notif-toggle-row" key={key}>
            <div className="notif-toggle-left">
              <span className="notif-toggle-icon">{icon}</span>
              <div>
                <div className="notif-toggle-label">{label}</div>
                <div className="notif-toggle-sub">{sub}</div>
              </div>
            </div>
            <label className={`notif-switch ${!isGranted ? 'notif-switch--disabled' : ''}`}>
              <input
                type="checkbox"
                checked={prefs[key] !== false}
                disabled={!isGranted}
                onChange={e => updatePref(key, e.target.checked)}
                aria-label={`Toggle ${label} notifications`}
              />
              <span className="notif-switch-track" />
            </label>
          </div>
        ))}
      </div>

      {/* ── Quiet Hours ── */}
      <p className="notif-section-title">Quiet Hours</p>
      <div className="notif-quiet-row">
        <div className="notif-quiet-label">
          🌙 Silence notifications from
        </div>
        <div className="notif-quiet-inputs">
          <select
            className="notif-quiet-select"
            value={prefs.quietStart ?? DEFAULT_NOTIF_PREFS.quietStart}
            disabled={!isGranted}
            onChange={e => updatePref('quietStart', Number(e.target.value))}
            aria-label="Quiet hours start time"
          >
            {HOURS.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
          <span className="notif-quiet-to">to</span>
          <select
            className="notif-quiet-select"
            value={prefs.quietEnd ?? DEFAULT_NOTIF_PREFS.quietEnd}
            disabled={!isGranted}
            onChange={e => updatePref('quietEnd', Number(e.target.value))}
            aria-label="Quiet hours end time"
          >
            {HOURS.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Debug token (dev only) ── */}
      {fcmToken && import.meta.env.DEV && (
        <div className="notif-token-info">
          FCM Token: {fcmToken.slice(0, 40)}…
        </div>
      )}

    </div>
  );
}
