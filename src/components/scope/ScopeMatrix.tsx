import type { ActionType, AutonomyLevel, ScopeCondition, ScopeRule } from '../../types';
import { ACTION_TYPES, AUTONOMY_LEVELS, AUTONOMY_RESTRICTIVENESS } from '../../types';
import { getConditionalRules, getDefaultRule } from '../../lib/scope';

const ACTION_TYPE_TITLES: Record<ActionType, string> = {
  outreach_draft: 'Outreach Draft',
  field_update: 'Field Update',
  sequence_enrollment: 'Sequence Enrollment',
  contact_creation: 'Contact Creation',
};

const COLUMN_HEADERS: Record<AutonomyLevel, string> = {
  auto_execute: 'AUTO-EXECUTE',
  rep_review: 'REP REVIEW',
  manager_approval: 'MANAGER APPROVAL',
  never: 'MANUAL',
};

function hasRestrictiveOverride(
  scopeRules: ScopeRule[],
  actionType: ActionType,
  baseLevel: AutonomyLevel,
): boolean {
  return getConditionalRules(scopeRules, actionType).some(
    (rule) =>
      AUTONOMY_RESTRICTIVENESS[rule.autonomyLevel] >
      AUTONOMY_RESTRICTIVENESS[baseLevel],
  );
}

interface ScopeMatrixProps {
  scopeRules: ScopeRule[];
  highlightedActionType?: ActionType;
  readOnly?: boolean;
  onSetDefault: (actionType: ActionType, level: AutonomyLevel) => void;
  onEditActionType: (actionType: ActionType) => void;
}

export function ScopeMatrix({
  scopeRules,
  highlightedActionType,
  readOnly,
  onSetDefault,
  onEditActionType,
}: ScopeMatrixProps) {
  return (
    <div className="scope-matrix-wrap">
      <table className="scope-matrix">
        <thead>
          <tr>
            <th className="matrix-corner mono">Action Type</th>
            {AUTONOMY_LEVELS.map((level) => (
              <th key={level} className="mono">
                {COLUMN_HEADERS[level]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ACTION_TYPES.map((actionType) => {
            const defaultRule = getDefaultRule(scopeRules, actionType);
            const currentLevel = defaultRule?.autonomyLevel ?? 'rep_review';
            const conditionalCount = getConditionalRules(
              scopeRules,
              actionType,
            ).length;
            const overrideActive = hasRestrictiveOverride(
              scopeRules,
              actionType,
              currentLevel,
            );
            const isHighlighted = highlightedActionType === actionType;

            return (
              <tr
                key={actionType}
                className={isHighlighted ? 'matrix-row-highlighted' : undefined}
              >
                <th scope="row" className="matrix-row-label">
                  <div className="matrix-row-label-stack">
                    <div className="matrix-action-name">
                      {ACTION_TYPE_TITLES[actionType]}
                    </div>
                    <div className="matrix-rule-count">
                      {conditionalCount} conditional rule
                      {conditionalCount === 1 ? '' : 's'}
                      {overrideActive && (
                        <span className="matrix-override-active">
                          {' '}
                          · Override active
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="matrix-refine-link mono"
                      onClick={() => onEditActionType(actionType)}
                    >
                      REFINE →
                    </button>
                  </div>
                </th>
                {AUTONOMY_LEVELS.map((level) => {
                  const isActive = currentLevel === level;

                  const handleCellActivate = () => {
                    if (!readOnly) {
                      onSetDefault(actionType, level);
                    }
                  };

                  return (
                    <td
                      key={level}
                      className="matrix-cell"
                      onClick={handleCellActivate}
                      onKeyDown={(e) => {
                        if (
                          !readOnly &&
                          (e.key === 'Enter' || e.key === ' ')
                        ) {
                          e.preventDefault();
                          handleCellActivate();
                        }
                      }}
                      tabIndex={readOnly ? undefined : 0}
                      role={readOnly ? undefined : 'button'}
                      aria-label={`Set ${ACTION_TYPE_TITLES[actionType]} to ${COLUMN_HEADERS[level]}`}
                      aria-pressed={isActive}
                    >
                      {isActive ? (
                        <div
                          className={`active-pill${level === 'never' ? ' never' : overrideActive ? ' override' : ''}`}
                        >
                          {level === 'never' ? 'MANUAL' : 'ACTIVE'}
                        </div>
                      ) : (
                        <div className="radio-empty" />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function getActionTypeTitle(actionType: ActionType): string {
  return ACTION_TYPE_TITLES[actionType];
}

export function getAutonomyColumnLabel(level: AutonomyLevel): string {
  return COLUMN_HEADERS[level];
}

function formatConditionCode(condition: ScopeCondition): string {
  const dimension = condition.dimension.replace(/_/g, ' ');
  const operator = condition.operator === 'is' ? '=' : '≠';
  return `${dimension} ${operator} ${condition.value}`;
}

export function formatConditionsCode(conditions: ScopeCondition[]): string {
  return conditions.map(formatConditionCode).join(' and ');
}

export function isRuleMoreRestrictiveThanBase(
  rules: ScopeRule[],
  rule: ScopeRule,
): boolean {
  const baseRule = getDefaultRule(rules, rule.actionType);
  if (!baseRule) return false;

  return (
    AUTONOMY_RESTRICTIVENESS[rule.autonomyLevel] >
    AUTONOMY_RESTRICTIVENESS[baseRule.autonomyLevel]
  );
}
