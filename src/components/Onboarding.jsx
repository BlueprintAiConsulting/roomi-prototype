import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { onboardingSteps } from '../data/sampleData.js';
import './Onboarding.css';

export default function Onboarding({ onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    preferredName: '',
    wakeTime: '',
    anchorName: '',
    hasMedications: false,
    medications: [],
    personalFact: '',
  });
  const [direction, setDirection] = useState('forward');
  const [medInput, setMedInput] = useState({ name: '', time: '8:00 AM' });
  const modalRef = useRef(null);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus trap inside modal
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const handleTrapFocus = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    modal.addEventListener('keydown', handleTrapFocus);
    // Auto-focus first focusable element
    const firstFocusable = modal.querySelector('input, button, select');
    if (firstFocusable) setTimeout(() => firstFocusable.focus(), 100);

    return () => modal.removeEventListener('keydown', handleTrapFocus);
  }, [currentStep]);

  // Filter steps based on conditional showIf logic
  const activeSteps = useMemo(() => {
    return onboardingSteps.filter(step => {
      if (!step.showIf) return true;
      return formData[step.showIf];
    });
  }, [formData]);

  const step = activeSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === activeSteps.length - 1;
  const progress = ((currentStep + 1) / activeSteps.length) * 100;
  const isOptional = step?.field && ['wakeTime', 'hasMedications', 'personalFact', 'anchorName', 'medications'].includes(step.field.key);

  const handleNext = () => {
    if (isLast) {
      onComplete(formData);
      return;
    }
    setDirection('forward');
    setCurrentStep(prev => Math.min(prev + 1, activeSteps.length - 1));
  };

  const handleBack = () => {
    setDirection('back');
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const addMedication = () => {
    if (!medInput.name.trim()) return;
    const newMed = {
      name: medInput.name.trim(),
      time: medInput.time,
      dosage: '',
    };
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, newMed],
    }));
    setMedInput({ name: '', time: '8:00 AM' });
  };

  const removeMedication = (index) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  const medTimeOptions = [
    '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM',
    '12:00 PM', '2:00 PM', '4:00 PM', '6:00 PM', '8:00 PM', '10:00 PM',
  ];

  const renderField = () => {
    if (!step?.field) return null;

    switch (step.field.type) {
      case 'text':
        return (
          <div className="onboard-field">
            <input
              type="text"
              className="onboard-input"
              placeholder={step.field.placeholder}
              value={formData[step.field.key] || ''}
              onChange={e => updateField(step.field.key, e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNext()}
              autoFocus
            />
          </div>
        );

      case 'time-select':
        return (
          <div className="onboard-field">
            <div className="onboard-time-grid">
              {step.field.options.map(time => (
                <button
                  key={time}
                  className={`onboard-time-btn ${formData[step.field.key] === time ? 'onboard-time-btn--active' : ''}`}
                  onClick={() => updateField(step.field.key, time)}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        );

      case 'toggle':
        return (
          <div className="onboard-field">
            <button
              className={`onboard-toggle ${formData[step.field.key] ? 'onboard-toggle--active' : ''}`}
              onClick={() => updateField(step.field.key, !formData[step.field.key])}
            >
              <span className="onboard-toggle-track">
                <span className="onboard-toggle-thumb" />
              </span>
              <span className="onboard-toggle-label">{step.field.label}</span>
            </button>
          </div>
        );

      case 'medication-input':
        return (
          <div className="onboard-field">
            {/* Already added medications */}
            {formData.medications.length > 0 && (
              <div className="onboard-med-list">
                {formData.medications.map((med, i) => (
                  <div key={i} className="onboard-med-chip">
                    <span className="onboard-med-chip-icon">💊</span>
                    <span className="onboard-med-chip-name">{med.name}</span>
                    <span className="onboard-med-chip-time">{med.time}</span>
                    <button
                      className="onboard-med-chip-remove"
                      onClick={() => removeMedication(i)}
                      aria-label={`Remove ${med.name}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add medication input */}
            <div className="onboard-med-add">
              <input
                type="text"
                className="onboard-input onboard-med-name-input"
                placeholder="Medication name (e.g., Lamotrigine 100mg)"
                value={medInput.name}
                onChange={e => setMedInput(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addMedication()}
                autoFocus
              />
              <div className="onboard-med-time-row">
                <span className="onboard-med-time-label">When?</span>
                <select
                  className="onboard-med-time-select"
                  value={medInput.time}
                  onChange={e => setMedInput(prev => ({ ...prev, time: e.target.value }))}
                >
                  {medTimeOptions.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  className="btn btn-teal btn-sm onboard-med-add-btn"
                  onClick={addMedication}
                  disabled={!medInput.name.trim()}
                >
                  Add
                </button>
              </div>
            </div>

            {formData.medications.length === 0 && (
              <p className="onboard-med-hint">Add your medications one at a time — or skip if you're not sure.</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!step) return null;

  return (
    <div className="onboard-overlay" onClick={onClose} role="presentation">
      <div className="onboard-modal" ref={modalRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Onboarding step ${currentStep + 1} of ${activeSteps.length}: ${step.title}`}>
        {/* Progress bar */}
        <div className="onboard-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin="0" aria-valuemax="100" aria-label={`Onboarding progress: ${Math.round(progress)}%`}>
          <div className="onboard-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        {/* Close button */}
        <button className="onboard-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Step content */}
        <div className={`onboard-content onboard-content--${direction}`} key={step.id}>
          {/* Fox avatar */}
          <div className="onboard-fox-wrapper">
            <div className="onboard-fox-glow" />
            <span className="onboard-fox">🦊</span>
          </div>

          {/* Step indicator */}
          <div className="onboard-step-indicator">
            {activeSteps.map((_, i) => (
              <span
                key={i}
                className={`onboard-dot ${i === currentStep ? 'onboard-dot--active' : ''} ${i < currentStep ? 'onboard-dot--completed' : ''}`}
              />
            ))}
          </div>

          <h2 className="onboard-title">{step.title}</h2>
          <p className="onboard-subtitle">{step.subtitle}</p>

          {renderField()}

          {/* Ready step special content */}
          {step.id === 'ready' && formData.preferredName && (
            <div className="onboard-summary">
              <div className="onboard-summary-item">
                <span className="onboard-summary-icon">👋</span>
                <span>I'll call you <strong>{formData.preferredName}</strong></span>
              </div>
              {formData.wakeTime && (
                <div className="onboard-summary-item">
                  <span className="onboard-summary-icon">⏰</span>
                  <span>Morning check-in at <strong>{formData.wakeTime}</strong></span>
                </div>
              )}
              {formData.anchorName && (
                <div className="onboard-summary-item">
                  <span className="onboard-summary-icon">🏠</span>
                  <span>Your go-to person: <strong>{formData.anchorName}</strong></span>
                </div>
              )}
              {formData.medications.length > 0 && (
                <div className="onboard-summary-item">
                  <span className="onboard-summary-icon">💊</span>
                  <span>{formData.medications.map(m => m.name).join(', ')} — I'll remind you</span>
                </div>
              )}
              {formData.hasMedications && formData.medications.length === 0 && (
                <div className="onboard-summary-item">
                  <span className="onboard-summary-icon">💊</span>
                  <span>I'll send you a gentle reminder each morning</span>
                </div>
              )}
              {formData.personalFact && (
                <div className="onboard-summary-item">
                  <span className="onboard-summary-icon">💛</span>
                  <span>{formData.personalFact}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="onboard-actions">
          {!isFirst && (
            <button className="btn btn-secondary btn-sm" onClick={handleBack}>
              Back
            </button>
          )}
          <div className="onboard-actions-right">
            {isOptional && (
              <button className="onboard-skip" onClick={handleNext}>
                Skip for now
              </button>
            )}
            <button
              className={`btn ${isLast ? 'btn-primary' : 'btn-teal'} btn-sm onboard-next`}
              onClick={handleNext}
            >
              {isFirst ? "Let's go!" : isLast ? 'Start with ROOMI 🦊' : 'Continue'}
              {!isLast && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
