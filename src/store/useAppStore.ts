import { create } from 'zustand';
import {
  FIXTURE_AGENT,
  FIXTURE_AUDIT_EVENTS,
  FIXTURE_QUEUE_ITEMS,
  FIXTURE_RECORDS,
  FIXTURE_SCOPE_RULES,
  FIXTURE_USERS,
} from '../data/fixtures';
import type {
  Agent,
  AuditEvent,
  AutonomyLevel,
  CrmRecord,
  DraftContent,
  QueueItem,
  RejectionCategory,
  ScopeBuilderFilter,
  ScopeRule,
  User,
  UserRole,
} from '../types';
import {
  buildQueueResolvedEvent,
  buildScopeRuleChangedEvent,
  copyDraftContent,
  countPendingForRep,
  reEvaluateQueueItems,
} from './utils';

export const PERSONA_USER_ID_BY_ROLE: Record<UserRole, string> = {
  rep: 'user-jordan',
  team_lead: 'user-alex',
  manager: 'user-sam',
};

export interface AppState {
  agent: Agent;
  users: User[];
  scopeRules: ScopeRule[];
  queueItems: QueueItem[];
  auditEvents: AuditEvent[];
  records: CrmRecord[];

  activeUserId: string;
  scopeBuilderFilter: ScopeBuilderFilter | null;
  onboardingComplete: boolean;
  agentPauseUntil: string | null;
}

export interface AppActions {
  setActiveUser: (userId: string) => void;
  setActiveUserByRole: (role: UserRole) => void;

  updateScopeRule: (
    ruleId: string,
    updates: Partial<Pick<ScopeRule, 'autonomyLevel' | 'conditions'>>,
  ) => void;
  addScopeRule: (rule: Omit<ScopeRule, 'id' | 'updatedAt'>) => void;

  approveQueueItem: (itemId: string) => void;
  rejectQueueItem: (
    itemId: string,
    reason: RejectionCategory,
    note?: string,
  ) => void;
  editAndApproveQueueItem: (itemId: string, editedContent: DraftContent) => void;

  approveManagerItem: (itemId: string) => void;
  denyManagerItem: (itemId: string, reason: RejectionCategory, note?: string) => void;

  setAgentEnabled: (userId: string, enabled: boolean) => void;
  pauseAgent: (until: string) => void;
  resumeAgent: () => void;

  setScopeBuilderFilter: (filter: ScopeBuilderFilter | null) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;

  getActiveUser: () => User;
  getPendingCount: (repId?: string) => number;
}

export type AppStore = AppState & AppActions;

function getActor(state: AppState): User {
  return state.users.find((u) => u.id === state.activeUserId)!;
}

function resolveItem(
  state: AppState,
  itemId: string,
  updates: Partial<QueueItem>,
): { queueItems: QueueItem[]; auditEvents: AuditEvent[] } {
  const actor = getActor(state);
  const now = new Date().toISOString();

  const queueItems = state.queueItems.map((item) => {
    if (item.id !== itemId) return item;

    const resolved: QueueItem = {
      ...item,
      ...updates,
      resolvedAt: now,
      resolvedBy: actor.id,
    };

    return resolved;
  });

  const resolvedItem = queueItems.find((item) => item.id === itemId)!;
  const auditEvents = [
    ...state.auditEvents,
    buildQueueResolvedEvent(resolvedItem, actor),
  ];

  return { queueItems, auditEvents };
}

export const useAppStore = create<AppStore>((set, get) => ({
  agent: FIXTURE_AGENT,
  users: FIXTURE_USERS,
  scopeRules: FIXTURE_SCOPE_RULES,
  queueItems: FIXTURE_QUEUE_ITEMS,
  auditEvents: FIXTURE_AUDIT_EVENTS,
  records: FIXTURE_RECORDS,

  activeUserId: 'user-alex',
  scopeBuilderFilter: null,
  onboardingComplete: true,
  agentPauseUntil: null,

  setActiveUser: (userId) => set({ activeUserId: userId }),

  setActiveUserByRole: (role) => {
    const userId = PERSONA_USER_ID_BY_ROLE[role];
    const user = get().users.find((u) => u.id === userId);
    if (user) set({ activeUserId: user.id });
  },

  updateScopeRule: (ruleId, updates) => {
    set((state) => {
      const actor = getActor(state);
      const existing = state.scopeRules.find((r) => r.id === ruleId);
      if (!existing) return state;

      const previousLevel = existing.autonomyLevel;
      const updatedRule: ScopeRule = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const scopeRules = state.scopeRules.map((rule) =>
        rule.id === ruleId ? updatedRule : rule,
      );

      const queueItems = reEvaluateQueueItems(
        state.queueItems,
        scopeRules,
        state.records,
        state.users,
      );

      const revokedItems = queueItems.filter(
        (item) =>
          item.status === 'revoked' &&
          state.queueItems.find((prev) => prev.id === item.id)?.status ===
            'pending',
      );

      const newEvents = revokedItems.map((item) =>
        buildQueueResolvedEvent(
          { ...item, resolvedAt: new Date().toISOString(), resolvedBy: actor.id },
          actor,
        ),
      );

      const auditEvents = [
        ...state.auditEvents,
        buildScopeRuleChangedEvent(updatedRule, actor, previousLevel),
        ...newEvents,
      ];

      return { scopeRules, queueItems, auditEvents };
    });
  },

  addScopeRule: (ruleInput) => {
    set((state) => {
      const actor = getActor(state);
      const newRule: ScopeRule = {
        ...ruleInput,
        id: `rule-${Date.now()}`,
        createdBy: actor.id,
        updatedAt: new Date().toISOString(),
      };

      const scopeRules = [...state.scopeRules, newRule];
      const queueItems = reEvaluateQueueItems(
        state.queueItems,
        scopeRules,
        state.records,
        state.users,
      );

      const auditEvents = [
        ...state.auditEvents,
        buildScopeRuleChangedEvent(newRule, actor, 'rep_review'),
      ];

      return { scopeRules, queueItems, auditEvents };
    });
  },

  approveQueueItem: (itemId) => {
    set((state) => {
      const item = state.queueItems.find((i) => i.id === itemId);
      if (!item || !item.draftContent) return state;

      const finalContent = copyDraftContent(item.draftContent);

      const { queueItems, auditEvents } = resolveItem(state, itemId, {
        status: 'approved',
        finalContent,
        editedContent: null,
      });

      return { queueItems, auditEvents };
    });
  },

  rejectQueueItem: (itemId, reason, note) => {
    set((state) => {
      const { queueItems, auditEvents } = resolveItem(state, itemId, {
        status: 'rejected',
        rejectionReason: reason,
        rejectionNote: note ?? null,
        finalContent: null,
      });

      return { queueItems, auditEvents };
    });
  },

  editAndApproveQueueItem: (itemId, editedContent) => {
    set((state) => {
      const edited = copyDraftContent(editedContent);
      const finalContent = copyDraftContent(editedContent);

      const { queueItems, auditEvents } = resolveItem(state, itemId, {
        status: 'edited_approved',
        editedContent: edited,
        finalContent,
      });

      return { queueItems, auditEvents };
    });
  },

  approveManagerItem: (itemId) => {
    set((state) => {
      const item = state.queueItems.find((i) => i.id === itemId);
      if (!item || item.status !== 'awaiting_manager_approval') return state;
      if (!item.draftContent) return state;

      const { queueItems, auditEvents } = resolveItem(state, itemId, {
        status: 'approved',
        finalContent: copyDraftContent(item.draftContent),
      });

      return { queueItems, auditEvents };
    });
  },

  denyManagerItem: (itemId, reason, note) => {
    set((state) => {
      const item = state.queueItems.find((i) => i.id === itemId);
      if (!item || item.status !== 'awaiting_manager_approval') return state;

      const { queueItems, auditEvents } = resolveItem(state, itemId, {
        status: 'rejected',
        rejectionReason: reason,
        rejectionNote: note ?? null,
        finalContent: null,
      });

      return { queueItems, auditEvents };
    });
  },

  setAgentEnabled: (userId, enabled) => {
    set((state) => ({
      users: state.users.map((user) =>
        user.id === userId ? { ...user, agentEnabled: enabled } : user,
      ),
    }));
  },

  pauseAgent: (until) => {
    set({
      agentPauseUntil: until,
      agent: { ...get().agent, status: 'paused' },
    });
  },

  resumeAgent: () => {
    set({
      agentPauseUntil: null,
      agent: { ...get().agent, status: 'active' },
    });
  },

  setScopeBuilderFilter: (filter) => set({ scopeBuilderFilter: filter }),

  completeOnboarding: () => set({ onboardingComplete: true }),

  resetOnboarding: () => set({ onboardingComplete: false }),

  getActiveUser: () => {
    const state = get();
    return state.users.find((u) => u.id === state.activeUserId)!;
  },

  getPendingCount: (repId) => {
    const state = get();
    const id = repId ?? state.activeUserId;
    return countPendingForRep(state.queueItems, id);
  },
}));

export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case 'rep':
      return '/queue';
    case 'team_lead':
      return '/scope';
    case 'manager':
      return '/audit';
  }
}

export function getUserByRole(users: User[], role: UserRole): User | undefined {
  return users.find((u) => u.id === PERSONA_USER_ID_BY_ROLE[role]);
}

export function getAutonomyLabel(level: AutonomyLevel): string {
  const labels: Record<AutonomyLevel, string> = {
    auto_execute: 'Auto-execute',
    rep_review: 'Rep review',
    manager_approval: 'Manager approval',
    never: 'Manual',
  };
  return labels[level];
}

export function getActionTypeLabel(type: import('../types').ActionType): string {
  const labels = {
    outreach_draft: 'Outreach draft',
    field_update: 'CRM field update',
    sequence_enrollment: 'Sequence enrollment',
    contact_creation: 'Contact creation',
  };
  return labels[type];
}
