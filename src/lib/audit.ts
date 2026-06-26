import type {
  ActionType,
  AuditEvent,
  AuditOutcome,
  QueueItem,
  User,
} from '../types';
import { ACTION_TYPES } from '../types';
import {
  filterEventsByDateRange,
  getDefaultDateRange,
  getHighRejectionActionTypes,
  getInactiveRepAnomaly,
  getRepeatedContactTouches,
  type AuditDateRange,
} from '../store/utils';
import { getActionTypeLabel } from '../store/useAppStore';

export type DateRangePreset = '7d' | '30d' | '90d';

export interface AuditFilters {
  preset: DateRangePreset;
  repId: string | 'all';
  actionType: ActionType | 'all';
  outcome: AuditOutcome | 'all';
}

export interface AuditSummary {
  totalActions: number;
  scopeRuleChanges: number;
  byActionType: Partial<Record<ActionType, number>>;
  outcomes: {
    approved: number;
    edited_approved: number;
    rejected: number;
    revoked: number;
    held: number;
    auto_executed: number;
  };
  rejectionRates: Array<{
    actionType: ActionType;
    total: number;
    rejected: number;
    rate: number;
  }>;
}

export function getDateRangeForPreset(preset: DateRangePreset): AuditDateRange {
  const end = new Date('2026-06-23T23:59:59.999Z');
  const start = new Date('2026-06-23T00:00:00.000Z');

  const dayCount = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  start.setUTCDate(start.getUTCDate() - (dayCount - 1));

  return { start: start.toISOString(), end: end.toISOString() };
}

export function isAutoExecuted(item: QueueItem): boolean {
  return (
    item.status === 'approved' &&
    item.resolvedAt !== null &&
    item.resolvedAt === item.generatedAt
  );
}

export function isEventAutoExecuted(
  event: AuditEvent,
  queueItems: QueueItem[],
): boolean {
  if (event.outcome !== 'approved') return false;
  if (event.metadata.autoExecuted === true) return true;
  if (!event.queueItemId) return false;

  const item = queueItems.find((q) => q.id === event.queueItemId);
  return item !== undefined && isAutoExecuted(item);
}

export function filterAuditEvents(
  events: AuditEvent[],
  filters: AuditFilters,
): AuditEvent[] {
  const range = getDateRangeForPreset(filters.preset);
  let filtered = filterEventsByDateRange(events, range);

  if (filters.repId !== 'all') {
    filtered = filtered.filter((e) => e.actorId === filters.repId);
  }

  if (filters.actionType !== 'all') {
    filtered = filtered.filter(
      (e) => e.metadata.actionType === filters.actionType,
    );
  }

  if (filters.outcome !== 'all') {
    filtered = filtered.filter((e) => e.outcome === filters.outcome);
  }

  return filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function computeAuditSummary(
  events: AuditEvent[],
  queueItems: QueueItem[],
): AuditSummary {
  const queueResolved = events.filter((e) => e.eventType === 'queue_item_resolved');
  const scopeChanges = events.filter((e) => e.eventType === 'scope_rule_changed');

  const byActionType: Partial<Record<ActionType, number>> = {};
  const outcomes = {
    approved: 0,
    edited_approved: 0,
    rejected: 0,
    revoked: 0,
    held: 0,
    auto_executed: 0,
  };

  for (const event of queueResolved) {
    const actionType = event.metadata.actionType as ActionType;
    byActionType[actionType] = (byActionType[actionType] ?? 0) + 1;

    if (event.outcome === 'approved') {
      if (isEventAutoExecuted(event, queueItems)) {
        outcomes.auto_executed += 1;
      } else {
        outcomes.approved += 1;
      }
    } else if (event.outcome in outcomes) {
      outcomes[event.outcome as keyof typeof outcomes] += 1;
    }
  }

  const rejectionRates = ACTION_TYPES.map((actionType) => {
    const typeEvents = queueResolved.filter(
      (e) => e.metadata.actionType === actionType,
    );
    const rejected = typeEvents.filter((e) => e.outcome === 'rejected').length;
    const total = typeEvents.length;
    return {
      actionType,
      total,
      rejected,
      rate: total > 0 ? rejected / total : 0,
    };
  }).filter((r) => r.total > 0);

  return {
    totalActions: queueResolved.length,
    scopeRuleChanges: scopeChanges.length,
    byActionType,
    outcomes,
    rejectionRates,
  };
}

export interface AuditAnomaly {
  id: string;
  type: 'high_rejection' | 'repeated_contact' | 'inactive_rep';
  title: string;
  description: string;
  actionType?: ActionType;
  dealStage?: string;
}

export function detectAnomalies(
  events: AuditEvent[],
  queueItems: QueueItem[],
  users: User[],
): AuditAnomaly[] {
  const anomalies: AuditAnomaly[] = [];

  const highRejectionTypes = getHighRejectionActionTypes(events);
  for (const actionType of highRejectionTypes) {
    anomalies.push({
      id: `anomaly-rejection-${actionType}`,
      type: 'high_rejection',
      title: `High rejection rate: ${getActionTypeLabel(actionType)}`,
      description: `Over 40% of ${getActionTypeLabel(actionType).toLowerCase()} actions were rejected this period. Review individual items to identify patterns.`,
      actionType,
      dealStage: actionType === 'outreach_draft' ? 'Discovery' : undefined,
    });
  }

  const repeatedTouches = getRepeatedContactTouches(queueItems);
  for (const contact of repeatedTouches) {
    anomalies.push({
      id: `anomaly-contact-${contact.contactId}`,
      type: 'repeated_contact',
      title: `${contact.displayName} — ${contact.touchCount} agent touches`,
      description: `Contact was touched ${contact.touchCount} times without any approval. May indicate over-aggressive outreach.`,
    });
  }

  const inactiveRep = getInactiveRepAnomaly(users, queueItems);
  if (inactiveRep) {
    anomalies.push({
      id: `anomaly-inactive-${inactiveRep.id}`,
      type: 'inactive_rep',
      title: `${inactiveRep.name}'s queue is being ignored`,
      description: `${inactiveRep.name} has pending items but zero approvals or rejections this period. Agent recommendations may not be reaching reps.`,
    });
  }

  return anomalies;
}

export function getOutcomeLabel(outcome: AuditOutcome): string {
  const labels: Record<AuditOutcome, string> = {
    approved: 'Approved',
    edited_approved: 'Edited & approved',
    rejected: 'Rejected',
    held: 'Held',
    rule_updated: 'Scope updated',
    revoked: 'Revoked',
  };
  return labels[outcome] ?? outcome;
}

export function formatAuditTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export { getDefaultDateRange };
