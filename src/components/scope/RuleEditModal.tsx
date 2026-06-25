import { useState } from 'react';
import type {
  ActionType,
  AutonomyLevel,
  ScopeCondition,
  ScopeRule,
} from '../../types';
import { ACTION_TYPES, AUTONOMY_LEVELS } from '../../types';
import { getActionTypeLabel, getAutonomyLabel } from '../../store/useAppStore';
import {
  CONTACT_TYPES,
  DEAL_STAGES,
  REP_ROLES,
} from '../../lib/scope';
import { Select } from '../ui/Select';

interface RuleEditModalProps {
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

export function RuleEditModal({
  rule,
  defaultActionType = 'outreach_draft',
  onSave,
  onCancel,
}: RuleEditModalProps) {
  const isNew = !rule;
  const [actionType, setActionType] = useState<ActionType>(
    rule?.actionType ?? defaultActionType,
  );
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>(
    rule?.autonomyLevel ?? 'rep_review',
  );
  const [conditions, setConditions] = useState<ScopeCondition[]>(
    rule?.conditions.length ? [...rule.conditions] : [emptyCondition()],
  );

  const updateCondition = (
    index: number,
    patch: Partial<ScopeCondition>,
  ) => {
    setConditions((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const next = { ...c, ...patch };
        if (patch.dimension) {
          next.value = getValueOptions(patch.dimension)[0];
        }
        return next;
      }),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ actionType, autonomyLevel, conditions });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? 'Add conditional rule' : 'Edit rule'}</h3>
        <p>
          Conditional rules override the matrix default when all conditions
          match. More restrictive rules win when multiple apply.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="rule-action-type">Action type</label>
              <Select
                id="rule-action-type"
                value={actionType}
                onChange={(e) =>
                  setActionType(e.target.value as ActionType)
                }
                disabled={!isNew && !!rule && rule.conditions.length === 0}
                fullWidth
              >
                {ACTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {getActionTypeLabel(type)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="form-group">
              <label htmlFor="rule-autonomy">Autonomy level</label>
              <Select
                id="rule-autonomy"
                value={autonomyLevel}
                onChange={(e) =>
                  setAutonomyLevel(e.target.value as AutonomyLevel)
                }
                fullWidth
              >
                {AUTONOMY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {getAutonomyLabel(level)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="conditions-editor">
            <label className="field-label">Conditions</label>
            {conditions.map((condition, index) => (
              <div key={index} className="condition-row">
                <Select
                  value={condition.dimension}
                  onChange={(e) =>
                    updateCondition(index, {
                      dimension: e.target.value as ScopeCondition['dimension'],
                    })
                  }
                  autoWidth
                >
                  {DIMENSION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <Select
                  value={condition.operator}
                  onChange={(e) =>
                    updateCondition(index, {
                      operator: e.target.value as ScopeCondition['operator'],
                    })
                  }
                  autoWidth
                >
                  <option value="is">is</option>
                  <option value="is_not">is not</option>
                </Select>
                <Select
                  value={condition.value}
                  onChange={(e) =>
                    updateCondition(index, { value: e.target.value })
                  }
                  autoWidth
                >
                  {getValueOptions(condition.dimension).map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </Select>
                {conditions.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() =>
                      setConditions((prev) =>
                        prev.filter((_, i) => i !== index),
                      )
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                setConditions((prev) => [...prev, emptyCondition()])
              }
            >
              Add condition
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isNew ? 'Add rule' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
