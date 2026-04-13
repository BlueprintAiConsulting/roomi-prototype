import { useState } from 'react';
import { onboardingSteps } from '../data/sampleData.js';
import './Onboarding.css';

export default function Onboarding({ onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    preferredName: '',
    wakeTime: '',
    hasMedications: false,
    personalFact: '',
  });
  const [direction, setDirection] = useState('forward');

 const step = onboardingSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === onboardingSteps.length - 1;
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const isOptional = step.field && ['wakeTime', 'hasMedications', 'personalFact'].includes(step.field.key);

  const handleNext = () => {
    if (isLast) {
      onComplete(formData);
      return;
    }
    setDirection('forward');
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setDirection('back');
    setCurrentStep(prev => prev - 1);
  };

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const renderField = () => {
    if (!step.field) return null;

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

      default:
        return null;
    }
  };

  return (
    <div className="onboard-overlay" onClick={onClose}>
      <div className="onboard-modal" onClick={e => e.stopPropagation()}>
        <div className="onboard-progress">
          <div className="onboard-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <button className="onboard-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className={`onboard-content onboard-content--${direction}`} key={currentStep}>
          <div className="onboard-fox-wrapper">
            <div className="onboard-fox-glow" />
            <span className="onboard-fox">🦊</span>
          </div>

          <div className="onboard-step-indicator">
            {onboardingSteps.map((_, i) => (
              <span
                key={i}
                className={`onboard-dot ${i === currentStep ? 'onboard-dot--active' : ''}  ${i < currentStep ? 'onboard-dot--completed' : ''}`}
              />
            ))}
          </div>

          <h2 className="onboard-title">{step.title}</h2>
          <p className="onboard-subtitle">{step.subtitle}</p>

          {renderField()}

          {step.id === 'ready' && formData.preferredName && (
          !<div className="onboard-summary">
            <div className="onboard-summary-item">
              <span className="onboard-summary-icon">👋</span>
              <span>I'll call you <strong>{formData.preferredName}</strong></span>
            </div>
            {formData.wakeTime && (
              <div className="onboard-summary-item">
                <span className="onboard-summary-icon">🔰</span>
                <span>Morning check-in at <strong>{formData.wakeTime}</strong></span>
              </div>
            )}
            {formData.hasMedications && (
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
