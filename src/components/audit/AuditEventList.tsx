import type { AuditEvent, ActionType, QueueItem } from '../../types';
import type { User } from '../../types';
import { getActionTypeLabel } from '../../store/useAppStore';
import { formatAuditTimestamp, isEventAutoExecuted } from '../../lib/audit';

interface AuditEventListProps {
  events: AuditEvent[];
  users: User[];
  queueItems: QueueItem[];
  selectedEventId: string | null;
  onSelect: (event: AuditEvent) => void;
}

function getOutcomeDisplay(
  event: AuditEvent,
  queueItems: QueueItem[],
): { label: string; className: string } {
  if (event.eventType === 'scope_rule_changed' || event.outcome === 'rule_updated') {
    return { label: 'RULE UPDATED', className: 'rule-updated' };
  }

  if (event.outcome === 'approved') {
    if (isEventAutoExecuted(event, queueItems)) {
      return { label: 'AUTO-EXECUTED', className: 'auto-executed' };
    }
    return { label: 'APPROVED', className: 'approved' };
  }

  const displays: Record<
    string,
    { label: string; className: string }
  > = {
    edited_approved: { label: 'EDITED & APPROVED', className: 'edited-approved' },
    rejected: { label: 'REJECTED', className: 'rejected' },
    held: { label: 'HELD', className: 'rule-updated' },
    revoked: { label: 'REVOKED', className: 'rule-updated' },
  };

  return (
    displays[event.outcome] ?? {
      label: event.outcome.replace(/_/g, ' ').toUpperCase(),
      className: 'rule-updated',
    }
  );
}

function getEventDescription(
  event: AuditEvent,
  target: { displayName: string } | undefined,
): string {
  if (event.eventType === 'scope_rule_changed') {
    return 'Scope rule updated';
  }

  return target?.displayName ?? '—';
}

export function AuditEventList({
  events,
  users,
  queueItems,
  selectedEventId,
  onSelect,
}: AuditEventListProps) {
  if (events.length === 0) {
    return (
      <p className="audit-empty-note">No events match the current filters.</p>
    );
  }

  return (
    <ul className="audit-event-list">
      {events.map((event) => {
        const actor = users.find((u) => u.id === event.actorId);
        const actionType = event.metadata.actionType as ActionType | undefined;
        const target = event.metadata.targetRecord as
          | { displayName: string }
          | undefined;
        const outcome = getOutcomeDisplay(event, queueItems);

        return (
          <li key={event.id}>
            <button
              type="button"
              className={`event-log-row${selectedEventId === event.id ? ' selected' : ''}`}
              onClick={() => onSelect(event)}
            >
              <span className={`event-outcome ${outcome.className}`}>
                {outcome.label}
              </span>
              <span className="event-action-type">
                {actionType ? getActionTypeLabel(actionType) : '—'}
              </span>
              <span className="event-description">
                {getEventDescription(event, target)}
              </span>
              <span className="event-actor">{actor?.name ?? 'Unknown'}</span>
              <span className="event-timestamp">
                {formatAuditTimestamp(event.timestamp)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
