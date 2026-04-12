  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const isOptional = step.field && ['wakeTime', 'hasMedications', 'personalFact'].includes(step.field.key);
































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
