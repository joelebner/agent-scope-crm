import { useState } from 'react';
import type {
  ActionType,
  AutonomyLevel,
  ScopeCondition,
  ScopeRule,
} from '../../types';
import { getActionTypeTitle } from './ScopeMatrix';
import {
  CONTACT_TYPES,
  DEAL_STAGES,
  REP_ROLES,
} from '../../lib/scope';
import { Select } from '../ui/Select';

interface RuleEditPanelProps {
  rule?: ScopeRule;
  defaultActionType?: ActionType;
  onSave: (data: {
    actionType: ActionType;
    autonomyLevel: AutonomyLevel;
    conditions: ScopeCondition[];
  }) => void;
  onCancel: () => void;
}

const DIMENSION_OPTIONS = [
  { value: 'deal_stage', label: 'Deal stage' },
  { value: 'contact_type', label: 'Contact type' },
  { value: 'rep_role', label: 'Rep role' },
] as const;

const AUTONOMY_TILES: {
  level: AutonomyLevel;
  title: string;
  description: string;
}[] = [
  {
    level: 'auto_execute',
    title: 'Auto-execute',
    description: 'Agent acts without review.',
  },
  {
    level: 'rep_review',
    title: 'Rep Review',
    description: "Action enters the rep's Review Queue.",
  },
  {
    level: 'manager_approval',
    title: 'Manager Approval',
    description: 'Action requires manager sign-off before execution.',
  },
  {
    level: 'never',
    title: 'Manual',
    description: 'Agent is blocked from this action. A human initiates it.',
  },
];

function getValueOptions(dimension: ScopeCondition['dimension']): string[] {
  switch (dimension) {
    case 'deal_stage':
      return [...DEAL_STAGES];
    case 'contact_type':
      return [...CONTACT_TYPES];
    case 'rep_role':
      return [...REP_ROLES];
  }
}

const emptyCondition = (): ScopeCondition => ({
  dimension: 'deal_stage',
  operator: 'is',
  value: DEAL_STAGES[0],
});

function formatConditionDisplay(condition: ScopeCondition): string {
  const dimension = condition.dimension.replace(/_/g, ' ');
  const operator = condition.operator === 'is' ? '=' : '≠';
  return `${dimension} ${operator} ${condition.value}`;
}

export function RuleEditPanel({
  rule,
  defaultActionType = 'outreach_draft',
  onSave,
  onCancel,
}: RuleEditPanelProps) {
  const actionType = rule?.actionType ?? defaultActionType;

  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>(
    rule?.autonomyLevel ?? 'rep_review',
  );
  const [conditions, setConditions] = useState<ScopeCondition[]>(
    rule?.conditions.length ? [...rule.conditions] : [],
  );
  const [draftCondition, setDraftCondition] = useState<ScopeCondition>(
    emptyCondition(),
  );

  const updateDraftCondition = (patch: Partial<ScopeCondition>) => {
    setDraftCondition((prev) => {
      const next = { ...prev, ...patch };
      if (patch.dimension) {
        next.value = getValueOptions(patch.dimension)[0];
      }
      return next;
    });
  };

  const handleAddCondition = () => {
    setConditions((prev) => [...prev, { ...draftCondition }]);
    setDraftCondition(emptyCondition());
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (conditions.length === 0) return;

    onSave({ actionType, autonomyLevel, conditions });
  };

  return (
    <>
    <div className="rule-panel-overlay" onClick={onCancel} aria-hidden="true" />
    <aside
      className="rule-side-panel"
      onClick={(e) => e.stopPropagation()}
      aria-label={rule ? 'Edit rule' : 'Add rule'}
    >
        <div className="rule-panel-header">
          <div className="rule-panel-meta">RULE</div>
          <div className="rule-panel-title">{getActionTypeTitle(actionType)}</div>
          <button
            type="button"
            className="rule-panel-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className="rule-panel-form" onSubmit={handleSubmit}>
          <div className="rule-panel-body">
            <section className="rule-panel-section">
              <h4 className="rule-panel-section-label mono">Autonomy Level</h4>
              {AUTONOMY_TILES.map((tile) => (
                <button
                  key={tile.level}
                  type="button"
                  className={`autonomy-tile${autonomyLevel === tile.level ? ' selected' : ''}`}
                  onClick={() => setAutonomyLevel(tile.level)}
                  aria-pressed={autonomyLevel === tile.level}
                >
                  <div className="autonomy-tile-title">{tile.title}</div>
                  <div className="autonomy-tile-desc">{tile.description}</div>
                </button>
              ))}
            </section>

            <section className="rule-panel-section">
              <h4 className="rule-panel-section-label mono">Conditions</h4>
              {conditions.map((condition, index) => (
                <div key={index} className="condition-row">
                  <span className="condition-text">
                    {formatConditionDisplay(condition)}
                  </span>
                  <button
                    type="button"
                    className="condition-remove"
                    onClick={() => handleRemoveCondition(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <div className="add-condition-builder">
                <div className="add-condition-fields">
                  <Select
                    value={draftCondition.dimension}
                    onChange={(e) =>
                      updateDraftCondition({
                        dimension: e.target.value as ScopeCondition['dimension'],
                      })
                    }
                    fullWidth
                  >
                    {DIMENSION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={draftCondition.operator}
                    onChange={(e) =>
                      updateDraftCondition({
                        operator: e.target.value as ScopeCondition['operator'],
                      })
                    }
                    autoWidth
                  >
                    <option value="is">is</option>
                    <option value="is_not">is not</option>
                  </Select>
                  <Select
                    value={draftCondition.value}
                    onChange={(e) =>
                      updateDraftCondition({ value: e.target.value })
                    }
                    fullWidth
                  >
                    {getValueOptions(draftCondition.dimension).map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </Select>
                </div>
                <button
                  type="button"
                  className="add-condition-btn"
                  onClick={handleAddCondition}
                >
                  + Add Condition
                </button>
              </div>
            </section>
          </div>

          <div className="rule-panel-footer">
            <button
              type="submit"
              className="rule-panel-save"
              disabled={conditions.length === 0}
            >
              Save Rule
            </button>
            <button type="button" className="rule-panel-cancel" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
