import type {
  ActionType,
  AuditEvent,
  AutonomyLevel,
  CrmRecord,
  DraftContent,
  QueueItem,
  RejectionCategory,
  ScopeBuilderFilter,
  ScopeCondition,
  ScopeRule,
  User,
} from '../types';
import { AUTONOMY_RESTRICTIVENESS } from '../types';

let eventCounter = 0;

export function createAuditEventId(): string {
  eventCounter += 1;
  return `audit-${Date.now()}-${eventCounter}`;
}

export function rulesMatchConditions(
  rule: ScopeRule,
  context: {
    dealStage?: string | null;
    contactType?: string | null;
    repRole?: string | null;
  },
): boolean {
  if (rule.conditions.length === 0) return true;

  return rule.conditions.every((condition) => {
    const value =
      condition.dimension === 'deal_stage'
        ? context.dealStage
        : condition.dimension === 'contact_type'
          ? context.contactType
          : context.repRole;

    if (value == null) return false;

    const matches = value === condition.value;
    return condition.operator === 'is' ? matches : !matches;
  });
}

export function getEffectiveAutonomyLevel(
  rules: ScopeRule[],
  actionType: ActionType,
  context: {
    dealStage?: string | null;
    contactType?: string | null;
    repRole?: string | null;
  },
): AutonomyLevel {
  const matching = rules.filter(
    (rule) =>
      rule.actionType === actionType && rulesMatchConditions(rule, context),
  );

  if (matching.length === 0) return 'rep_review';

  return matching.reduce((mostRestrictive, rule) =>
    AUTONOMY_RESTRICTIVENESS[rule.autonomyLevel] >
    AUTONOMY_RESTRICTIVENESS[mostRestrictive.autonomyLevel]
      ? rule
      : mostRestrictive,
  ).autonomyLevel;
}

export function findConflictingRules(rules: ScopeRule[]): ScopeRule[][] {
  const groups = new Map<string, ScopeRule[]>();

  for (const rule of rules) {
    const key = `${rule.actionType}::${JSON.stringify(rule.conditions)}`;
    const existing = groups.get(key) ?? [];
    existing.push(rule);
    groups.set(key, existing);
  }

  return [...groups.values()].filter((group) => {
    const levels = new Set(group.map((r) => r.autonomyLevel));
    return levels.size > 1;
  });
}

export function getRecordContext(
  records: CrmRecord[],
  targetRecord: QueueItem['targetRecord'],
): { dealStage: string | null; contactType: string | null } {
  const record = records.find((r) => r.id === targetRecord.id);
  if (record) {
    return {
      dealStage: record.dealStage,
      contactType: record.contactType,
    };
  }

  if (targetRecord.type === 'deal') {
    return { dealStage: null, contactType: null };
  }

  return { dealStage: null, contactType: null };
}

export function shouldRevokeItem(
  rules: ScopeRule[],
  item: QueueItem,
  records: CrmRecord[],
  users: User[],
): boolean {
  const rep = users.find((u) => u.id === item.assignedRep);
  const context = getRecordContext(records, item.targetRecord);
  const level = getEffectiveAutonomyLevel(rules, item.actionType, {
    ...context,
    repRole: rep?.role ?? null,
  });

  return level === 'never' && item.status === 'pending';
}

export function reEvaluateQueueItems(
  queueItems: QueueItem[],
  scopeRules: ScopeRule[],
  records: CrmRecord[],
  users: User[],
): QueueItem[] {
  return queueItems.map((item) => {
    if (item.status !== 'pending') return item;

    if (shouldRevokeItem(scopeRules, item, records, users)) {
      return { ...item, status: 'revoked' as const };
    }

    return item;
  });
}

export function buildQueueResolvedEvent(
  item: QueueItem,
  actor: User,
): AuditEvent {
  const outcome =
    item.status === 'approved'
      ? 'approved'
      : item.status === 'edited_approved'
        ? 'edited_approved'
        : item.status === 'rejected'
          ? 'rejected'
          : item.status === 'revoked'
            ? 'revoked'
            : 'held';

  return {
    id: createAuditEventId(),
    eventType: 'queue_item_resolved',
    queueItemId: item.id,
    scopeRuleId: null,
    outcome,
    actorId: actor.id,
    actorRole: actor.role,
    timestamp: item.resolvedAt ?? new Date().toISOString(),
    metadata: {
      actionType: item.actionType,
      targetRecord: item.targetRecord,
      rejectionReason: item.rejectionReason,
      rejectionNote: item.rejectionNote,
      confidenceScore: item.confidenceScore,
    },
  };
}

export function buildScopeRuleChangedEvent(
  rule: ScopeRule,
  actor: User,
  previousLevel: AutonomyLevel,
): AuditEvent {
  return {
    id: createAuditEventId(),
    eventType: 'scope_rule_changed',
    queueItemId: null,
    scopeRuleId: rule.id,
    outcome: 'rule_updated',
    actorId: actor.id,
    actorRole: actor.role,
    timestamp: new Date().toISOString(),
    metadata: {
      actionType: rule.actionType,
      previousLevel,
      newLevel: rule.autonomyLevel,
      conditions: rule.conditions,
    },
  };
}

export function copyDraftContent(content: DraftContent): DraftContent {
  return structuredClone(content);
}

export interface AuditDateRange {
  start: string;
  end: string;
}

export function filterEventsByDateRange(
  events: AuditEvent[],
  range: AuditDateRange,
): AuditEvent[] {
  const start = new Date(range.start).getTime();
  const end = new Date(range.end).getTime();

  return events.filter((event) => {
    const ts = new Date(event.timestamp).getTime();
    return ts >= start && ts <= end;
  });
}

export function getDefaultDateRange(): AuditDateRange {
  const end = new Date('2026-06-23T23:59:59.999Z');
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function countPendingForRep(
  queueItems: QueueItem[],
  repId: string,
): number {
  return queueItems.filter(
    (item) => item.assignedRep === repId && item.status === 'pending',
  ).length;
}

export function getInactiveRepAnomaly(users: User[], queueItems: QueueItem[]) {
  const reps = users.filter((u) => u.role === 'rep');

  return reps.find((rep) => {
    const pending = queueItems.filter(
      (item) => item.assignedRep === rep.id && item.status === 'pending',
    );
    const resolved = queueItems.filter(
      (item) =>
        item.assignedRep === rep.id &&
        item.resolvedAt !== null &&
        ['approved', 'edited_approved', 'rejected'].includes(item.status),
    );
    return pending.length >= 6 && resolved.length === 0;
  });
}

export function getHighRejectionActionTypes(
  events: AuditEvent[],
): ActionType[] {
  const byType = new Map<ActionType, { total: number; rejected: number }>();

  for (const event of events) {
    if (event.eventType !== 'queue_item_resolved') continue;
    const actionType = event.metadata.actionType as ActionType;
    const entry = byType.get(actionType) ?? { total: 0, rejected: 0 };
    entry.total += 1;
    if (event.outcome === 'rejected') entry.rejected += 1;
    byType.set(actionType, entry);
  }

  return [...byType.entries()]
    .filter(([, stats]) => stats.total >= 5 && stats.rejected / stats.total > 0.4)
    .map(([type]) => type);
}

export function getRepeatedContactTouches(
  queueItems: QueueItem[],
): { contactId: string; displayName: string; touchCount: number }[] {
  const byContact = new Map<
    string,
    { displayName: string; touches: QueueItem[] }
  >();

  for (const item of queueItems) {
    if (item.targetRecord.type !== 'contact') continue;

    const existing = byContact.get(item.targetRecord.id) ?? {
      displayName: item.targetRecord.displayName,
      touches: [],
    };
    existing.touches.push(item);
    byContact.set(item.targetRecord.id, existing);
  }

  return [...byContact.entries()]
    .map(([contactId, { displayName, touches }]) => {
      const approved = touches.filter(
        (t) => t.status === 'approved' || t.status === 'edited_approved',
      );

      if (touches.length >= 3 && approved.length === 0) {
        return {
          contactId,
          displayName,
          touchCount: touches.length,
        };
      }
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export function conditionsEqual(
  a: ScopeCondition[],
  b: ScopeCondition[],
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function applyScopeBuilderFilter(
  rules: ScopeRule[],
  filter: ScopeBuilderFilter | null,
): ScopeRule[] {
  if (!filter) return rules;

  return rules.filter((rule) => {
    if (filter.actionType && rule.actionType !== filter.actionType) {
      return false;
    }
    if (filter.dealStage) {
      const hasStage = rule.conditions.some(
        (c) => c.dimension === 'deal_stage' && c.value === filter.dealStage,
      );
      if (!hasStage && rule.conditions.length > 0) return false;
    }
    return true;
  });
}

export interface RejectQueueItemInput {
  itemId: string;
  reason: RejectionCategory;
  note?: string;
}

export interface EditApproveInput {
  itemId: string;
  editedContent: DraftContent;
}
