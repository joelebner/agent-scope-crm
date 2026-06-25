import { useRef, useState } from 'react';
import { useAppStore } from '../store';
import { getActionTypeLabel } from '../store/useAppStore';
import { findConflictingRules } from '../store/utils';
import { ScopeMatrix } from '../components/scope/ScopeMatrix';
import { ConditionalRulesList } from '../components/scope/ConditionalRulesList';
import { ConflictBanner } from '../components/scope/ConflictBanner';
import { RuleEditModal } from '../components/scope/RuleEditModal';
import { OnboardingWizard } from '../components/scope/OnboardingWizard';
import { Toast } from '../components/ui/Toast';
import { getDefaultRule, getMatrixDefaults } from '../lib/scope';
import type { ActionType, AutonomyLevel, ScopeRule } from '../types';

function ScopePageHeader() {
  return (
    <header className="scope-page-header">
      <div className="scope-page-header-top">
        <div className="scope-page-header-copy">
          <p className="scope-page-eyebrow mono">Permission Matrix</p>
          <h1 className="scope-page-title">Agent Scope</h1>
          <p className="scope-page-description">
            The behavioral envelope for the AI agent.
          </p>
          <p className="scope-page-description">
            Each row is an action type; each column an autonomy level.
            Conditional refinements open in the side panel.
          </p>
        </div>
      </div>
      <div className="scope-page-divider" aria-hidden="true" />
    </header>
  );
}

export function ScopeBuilder() {
  const conditionalRef = useRef<HTMLElement>(null);

  const scopeRules = useAppStore((s) => s.scopeRules);
  const scopeBuilderFilter = useAppStore((s) => s.scopeBuilderFilter);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const activeUser = useAppStore((s) => s.getActiveUser());
  const updateScopeRule = useAppStore((s) => s.updateScopeRule);
  const addScopeRule = useAppStore((s) => s.addScopeRule);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const setScopeBuilderFilter = useAppStore((s) => s.setScopeBuilderFilter);

  const [editingRule, setEditingRule] = useState<ScopeRule | null>(null);
  const [addingRuleFor, setAddingRuleFor] = useState<ActionType | null>(null);
  const [focusActionType, setFocusActionType] = useState<ActionType | null>(
    scopeBuilderFilter?.actionType ?? null,
  );
  const [toast, setToast] = useState<string | null>(null);

  const readOnly = activeUser.role !== 'team_lead';
  const conflicts = findConflictingRules(scopeRules);
  const highlightedActionType =
    focusActionType ?? scopeBuilderFilter?.actionType;

  const handleSetDefault = (actionType: ActionType, level: AutonomyLevel) => {
    const defaultRule = getDefaultRule(scopeRules, actionType);
    if (!defaultRule) return;

    const revokedBefore = useAppStore
      .getState()
      .queueItems.filter((i) => i.status === 'revoked').length;

    updateScopeRule(defaultRule.id, { autonomyLevel: level });

    const revokedAfter = useAppStore
      .getState()
      .queueItems.filter((i) => i.status === 'revoked').length;
    const newlyRevoked = revokedAfter - revokedBefore;

    let message = `${getActionTypeLabel(actionType)} default set to ${level.replace(/_/g, ' ')}.`;
    if (newlyRevoked > 0) {
      message += ` ${newlyRevoked} queue item${newlyRevoked > 1 ? 's' : ''} revoked by policy.`;
    }
    setToast(message);
  };

  const handleEditActionType = (actionType: ActionType) => {
    setFocusActionType(actionType);
    conditionalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSaveRule = (data: {
    actionType: ActionType;
    autonomyLevel: AutonomyLevel;
    conditions: ScopeRule['conditions'];
  }) => {
    if (editingRule) {
      const revokedBefore = useAppStore
        .getState()
        .queueItems.filter((i) => i.status === 'revoked').length;

      updateScopeRule(editingRule.id, {
        autonomyLevel: data.autonomyLevel,
        conditions: data.conditions,
      });

      const newlyRevoked =
        useAppStore.getState().queueItems.filter((i) => i.status === 'revoked')
          .length - revokedBefore;

      setToast(
        newlyRevoked > 0
          ? `Rule updated. ${newlyRevoked} queue item${newlyRevoked > 1 ? 's' : ''} revoked.`
          : 'Rule updated. Queue items re-evaluated.',
      );
    } else {
      addScopeRule({
        actionType: data.actionType,
        autonomyLevel: data.autonomyLevel,
        conditions: data.conditions,
        createdBy: activeUser.id,
      });
      setToast('Conditional rule added.');
    }
    setEditingRule(null);
    setAddingRuleFor(null);
  };

  const handleOnboardingComplete = (
    levels: Record<ActionType, AutonomyLevel>,
  ) => {
    const currentRules = useAppStore.getState().scopeRules;
    for (const actionType of Object.keys(levels) as ActionType[]) {
      const defaultRule = getDefaultRule(currentRules, actionType);
      if (defaultRule && defaultRule.autonomyLevel !== levels[actionType]) {
        updateScopeRule(defaultRule.id, {
          autonomyLevel: levels[actionType],
        });
      }
    }
    completeOnboarding();
    setToast('Agent scope configured. Changes logged to audit.');
  };

  if (!onboardingComplete && activeUser.role === 'team_lead') {
    return (
      <OnboardingWizard
        initialLevels={getMatrixDefaults(scopeRules)}
        onComplete={handleOnboardingComplete}
        onSkip={() => {
          completeOnboarding();
          setToast('Using existing scope configuration.');
        }}
      />
    );
  }

  if (readOnly) {
    return (
      <div className="scope-builder">
        <div className="scope-builder-content">
          <ScopePageHeader />

          <ScopeMatrix
            scopeRules={scopeRules}
            highlightedActionType={highlightedActionType}
            readOnly
            onSetDefault={() => {}}
            onEditActionType={() => {}}
          />

          <section ref={conditionalRef} className="scope-conditional-section">
            <h3 className="scope-section-label mono">Conditional Refinements</h3>
            <ConditionalRulesList
              rules={scopeRules}
              filterActionType={highlightedActionType ?? undefined}
              readOnly
              onEdit={() => {}}
              onAdd={() => {}}
            />
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="scope-builder">
      <div className="scope-builder-content">
        <ScopePageHeader />

        {scopeBuilderFilter && (
          <div className="filter-banner">
            <span>
              Filtered from Activity Audit:{' '}
              <strong>
                {scopeBuilderFilter.actionType
                  ? getActionTypeLabel(scopeBuilderFilter.actionType)
                  : 'All actions'}
              </strong>
              {scopeBuilderFilter.dealStage &&
                ` · ${scopeBuilderFilter.dealStage}`}
            </span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setScopeBuilderFilter(null);
                setFocusActionType(null);
              }}
            >
              Clear filter
            </button>
          </div>
        )}

        <ConflictBanner conflicts={conflicts} />

        <section className="scope-matrix-section">
          <ScopeMatrix
            scopeRules={scopeRules}
            highlightedActionType={highlightedActionType}
            onSetDefault={handleSetDefault}
            onEditActionType={handleEditActionType}
          />
        </section>

        <section ref={conditionalRef} className="scope-conditional-section">
          <h3 className="scope-section-label mono">Conditional Refinements</h3>
          <ConditionalRulesList
            rules={scopeRules}
            filterActionType={highlightedActionType ?? undefined}
            onEdit={setEditingRule}
            onAdd={(type) => setAddingRuleFor(type)}
          />
        </section>
      </div>

      {(editingRule || addingRuleFor) && (
        <RuleEditModal
          rule={editingRule ?? undefined}
          defaultActionType={addingRuleFor ?? editingRule?.actionType}
          onSave={handleSaveRule}
          onCancel={() => {
            setEditingRule(null);
            setAddingRuleFor(null);
          }}
        />
      )}

      <Toast message={toast} onClear={() => setToast(null)} />
    </div>
  );
}
