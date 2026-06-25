import type {
  ActionType,
  AutonomyLevel,
  ScopeCondition,
  ScopeRule,
} from '../types';
import { ACTION_TYPES, AUTONOMY_LEVELS } from '../types';

export const DEAL_STAGES = [
  'Discovery',
  'Qualification',
  'Technical Validation',
  'Negotiation',
  'Proposal',
] as const;

export const CONTACT_TYPES = [
  'Decision Maker',
  'Champion',
  'Influencer',
  'Technical Evaluator',
] as const;

export const REP_ROLES = ['rep', 'team_lead', 'manager'] as const;

export function getDefaultRule(
  rules: ScopeRule[],
  actionType: ActionType,
): ScopeRule | undefined {
  return rules.find(
    (rule) => rule.actionType === actionType && rule.conditions.length === 0,
  );
}

export function getConditionalRules(
  rules: ScopeRule[],
  actionType?: ActionType,
): ScopeRule[] {
  return rules.filter(
    (rule) =>
      rule.conditions.length > 0 &&
      (actionType ? rule.actionType === actionType : true),
  );
}

export function formatCondition(condition: ScopeCondition): string {
  const dimensionLabels = {
    deal_stage: 'Deal stage',
    contact_type: 'Contact type',
    rep_role: 'Rep role',
  };
  const operator = condition.operator === 'is' ? 'is' : 'is not';
  return `${dimensionLabels[condition.dimension]} ${operator} ${condition.value}`;
}

export function formatConditions(conditions: ScopeCondition[]): string {
  if (conditions.length === 0) return 'All records (default)';
  return conditions.map(formatCondition).join(' · ');
}

export function getAutonomyShortLabel(level: AutonomyLevel): string {
  const labels: Record<AutonomyLevel, string> = {
    auto_execute: 'Auto',
    rep_review: 'Rep review',
    manager_approval: 'Manager',
    never: 'Manual',
  };
  return labels[level];
}

export function getMatrixDefaults(
  rules: ScopeRule[],
): Record<ActionType, AutonomyLevel> {
  const defaults = {} as Record<ActionType, AutonomyLevel>;

  for (const actionType of ACTION_TYPES) {
    const rule = getDefaultRule(rules, actionType);
    defaults[actionType] = rule?.autonomyLevel ?? 'rep_review';
  }

  return defaults;
}

export { ACTION_TYPES, AUTONOMY_LEVELS };
