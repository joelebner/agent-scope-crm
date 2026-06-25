import type { ActionType, ScopeRule } from '../../types';
import {
  formatConditionsCode,
  getActionTypeTitle,
  getAutonomyColumnLabel,
  isRuleMoreRestrictiveThanBase,
} from './ScopeMatrix';

interface ConditionalRulesListProps {
  rules: ScopeRule[];
  filterActionType?: ActionType;
  readOnly?: boolean;
  onEdit: (rule: ScopeRule) => void;
  onAdd: (actionType: ActionType) => void;
}

export function ConditionalRulesList({
  rules,
  filterActionType,
  readOnly,
  onEdit,
  onAdd,
}: ConditionalRulesListProps) {
  const conditional = rules.filter(
    (rule) =>
      rule.conditions.length > 0 &&
      (!filterActionType || rule.actionType === filterActionType),
  );

  if (conditional.length === 0 && readOnly) {
    return (
      <p className="scope-empty-conditions">No conditional refinements configured.</p>
    );
  }

  return (
    <div className="conditional-refinements">
      {conditional.length === 0 ? (
        <p className="scope-empty-conditions">
          No conditional refinements yet. Use the matrix defaults above, or add
          rules scoped by deal stage, contact type, or rep role.
        </p>
      ) : (
        <ul className="conditional-refinements-list">
          {conditional.map((rule) => {
            const isMoreRestrictive = isRuleMoreRestrictiveThanBase(rules, rule);

            return (
              <li key={rule.id} className="conditional-refinement-row">
                <div className="conditional-refinement-body">
                  <div className="conditional-refinement-top">
                    <div className="conditional-refinement-primary">
                      <span className="conditional-refinement-action">
                        {getActionTypeTitle(rule.actionType)}
                      </span>
                      <span className="conditional-refinement-when"> when </span>
                      <span className="conditional-refinement-condition mono">
                        {formatConditionsCode(rule.conditions)}
                      </span>
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        className="conditional-rule-edit mono"
                        onClick={() => onEdit(rule)}
                      >
                        EDIT
                      </button>
                    )}
                  </div>
                  <div className="conditional-refinement-bottom mono">
                    <span className="conditional-refinement-arrow">
                      → {getAutonomyColumnLabel(rule.autonomyLevel)}
                    </span>
                    {isMoreRestrictive && (
                      <span className="conditional-refinement-override">
                        {' '}
                        · OVERRIDES BASE (MORE RESTRICTIVE)
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && (
        <button
          type="button"
          className="btn btn-sm conditional-refinements-add"
          onClick={() => onAdd(filterActionType ?? 'outreach_draft')}
        >
          Add conditional rule
        </button>
      )}
    </div>
  );
}
