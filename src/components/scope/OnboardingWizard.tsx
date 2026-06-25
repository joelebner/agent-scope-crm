import { useState } from 'react';
import type { ActionType, AutonomyLevel } from '../../types';
import { ACTION_TYPES, AUTONOMY_LEVELS } from '../../types';
import { getActionTypeLabel, getAutonomyLabel } from '../../store/useAppStore';
import { Select } from '../ui/Select';

interface OnboardingWizardProps {
  initialLevels: Record<ActionType, AutonomyLevel>;
  onComplete: (levels: Record<ActionType, AutonomyLevel>) => void;
  onSkip: () => void;
}

const STEP_TITLES = [
  'Define your agent\'s behavioral envelope',
  'Set autonomy levels by action type',
  'Review your configuration',
];

export function OnboardingWizard({
  initialLevels,
  onComplete,
  onSkip,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [levels, setLevels] = useState(initialLevels);

  return (
    <div className="onboarding-wizard">
      <div className="wizard-progress">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`wizard-step-dot${i <= step ? ' active' : ''}${i < step ? ' done' : ''}`}
          />
        ))}
      </div>

      <h2 className="wizard-title">{STEP_TITLES[step]}</h2>

      {step === 0 && (
        <div className="wizard-body">
          <p>
            Agent Scope lets you define what your AI agent may do autonomously,
            what requires rep review, what needs manager approval, and what is
            manual only.
          </p>
          <p>
            This is not a workflow builder — it is a permissions matrix for
            agent governance. You can add conditional logic after setup.
          </p>
          <ul className="wizard-list">
            <li>Outreach drafts — email and LinkedIn messages</li>
            <li>CRM field updates — deal stage, contact fields</li>
            <li>Sequence enrollments — adding contacts to nurture flows</li>
            <li>Contact creation — new records in CRM</li>
          </ul>
          <button type="button" className="wizard-skip-link" onClick={onSkip}>
            Skip — keep current scope settings
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="wizard-body">
          <p className="wizard-hint">
            Choose the default autonomy level for each action type. You can
            refine with conditions later.
          </p>
          <div className="wizard-matrix">
            {ACTION_TYPES.map((actionType) => (
              <div key={actionType} className="wizard-matrix-row">
                <span className="wizard-matrix-label">
                  {getActionTypeLabel(actionType)}
                </span>
                <Select
                  value={levels[actionType]}
                  onChange={(e) =>
                    setLevels((prev) => ({
                      ...prev,
                      [actionType]: e.target.value as AutonomyLevel,
                    }))
                  }
                  autoWidth
                >
                  {AUTONOMY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {getAutonomyLabel(level)}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-body">
          <p>Your agent will operate within these default boundaries:</p>
          <ul className="wizard-summary">
            {ACTION_TYPES.map((actionType) => (
              <li key={actionType}>
                <strong>{getActionTypeLabel(actionType)}</strong>
                <span>{getAutonomyLabel(levels[actionType])}</span>
              </li>
            ))}
          </ul>
          <p className="wizard-hint">
            Changes are logged in the Activity Audit. Reps will see new review
            items based on these settings.
          </p>
        </div>
      )}

      <div className="wizard-actions">
        {step > 0 && (
          <button
            type="button"
            className="btn"
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </button>
        )}
        <div style={{ flex: 1 }} />
        {step < 2 ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onComplete(levels)}
          >
            Open Scope Builder
          </button>
        )}
      </div>
    </div>
  );
}
