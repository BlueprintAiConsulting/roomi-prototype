import { useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications.js';
import './NotificationPrompt.css';

export default function NotificationPrompt({ userId, userName, onDismiss }) {
  const { isSupported, isGranted, requestPermission, sendTestNotification } = usePushNotifications(userId);
  const [status, setStatus] = useState('idle'); // idle | requesting | granted | denied

  if (!isSupported || isGranted) return null;

  const handleEnable = async () => {
    setStatus('requesting');
    const result = await requestPermission();
    setStatus(result);

    if (result === 'granted') {
      setTimeout(sendTestNotification, 1500);
    }
  };

  if (status === 'granted') {
    return (
      <div className="notif-prompt notif-prompt--success">
        <span className="notif-prompt-icon">🔔</span>
        <div>
          <strong>You're all set, {userName || 'friend'}!</strong>
          <p>ROOMI will check in with you every day 🦊✨</p>
        </div>
        <button className="notif-dismiss" onClick={onDismiss} aria-label="Dismiss">✕</button>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="notif-prompt notif-prompt--denied">
        <span className="notif-prompt-icon">🔕</span>
        <div>
          <p>No worries! You can enable reminders in your browser settings anytime.</p>
        </div>
        <button className="notif-dismiss" onClick={onDismiss} aria-label="Dismiss">✕</button>
      </div>
    );
  }

  return (
    <div className="notif-prompt">
      <span className="notif-prompt-icon">🦊</span>
      <div className="notif-prompt-content">
        <strong>Stay connected with ROOMI</strong>
        <p>Get gentle daily check-ins — morning, midday, and evening.</p>
      </div>
      <div className="notif-prompt-actions">
        <button
          className="notif-btn notif-btn--enable"
          onClick={handleEnable}
          disabled={status === 'requesting'}
        >
          {status === 'requesting' ? '…' : '🔔 Enable'}
        </button>
        <button className="notif-btn notif-btn--skip" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
