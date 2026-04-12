import React, { useState, useEffect } from 'react';
import './Onboarding.css';

const onboardingSteps = [
  {
        title: "Welcome to ROOMI",
        message: "I'm your co-pilot for independence. Let's get set up so I can support you best.",
        illustration: "Fox"
  },
  {
        title: "Your Rhythm",
        message: "What time do you usually wake up? I'll use this to help structure your day.",
        field: { key: 'wakeTime', type: 'time-select', options: ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM'], placeholder: 'Select time' },
        illustration: "Sun"
  },
  {
        title: "Daily Support",
        message: "Do you have any medications or daily routines you'd like me to help you track?",
        field: { key: 'hasMedications', type: 'toggle', label: 'Help me track medications', placeholder: '' },
        illustration: "Pill"
  },
  {
        title: "One More Thing",
        message: "Tell me one thing that makes today a good day for you.",
        field: { key: 'personalFact', type: 'text', placeholder: 'e.g., My morning coffee, seeing friends...' },
        illustration: "Star"
  },
  {
        title: "Ready to go!",
        message: "I'm so excited to help you navigate your day. Let's start our journey together.",
        illustration: "Fox"
  }
  ];

export default function Onboarding({ onClose, onComplete }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({});
    const [direction, setDirection] = useState('forward');

  const step = onboardingSteps[currentStep];
    const isLast = currentStep === onboardingSteps.length - 1;
    const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
    const isOptional = step.field && ['wakeTime', 'hasMedications', 'personalFact'].includes(step.field.key);

  const handleNext = () => {
        if (isLast) {
                onComplete(formData);
        } else {
                setDirection('forward');
                setCurrentStep(prev => prev + 1);
        }
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
                                </div>div>
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
                                  <div className="onboard-progress-bar" style={ width: `${progress}%` } />
                        </div>
                
                        <button className="onboard-close" onClick={onClose} aria-label="Close">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                  </svg>
                        </button>
                
                        <div className={`onboard-content onboard-content--${direction}`} key={currentStep}>
                                  <div className="onboard-fox-wrapper">
                                              <div className="onboard-fox">
                                                            <span className="onboard-fox-emoji">{step.illustration}</span>
                                              </div>
                                  </div>
                        
                                  <h2 className="onboard-title">{step.title}</h2>
                                  <p className="onboard-message">{step.message}</p>
                        
                          {renderField()}
                        </div>
                
                        <div className="onboard-actions">
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
                                                {isLast ? 'Get Started' : 'Continue'}
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                                                            </svg>
                                              </button>
                                  </div>
                        </div>
                </div>
          </div>
        );
}
</div>
