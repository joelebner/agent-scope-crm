import type { AuditEvent } from '../../types';
import type { User } from '../../types';
import { getActionTypeLabel } from '../../store/useAppStore';
import { formatAuditTimestamp, getOutcomeLabel } from '../../lib/audit';
import type { ActionType } from '../../types';

interface AuditEventListProps {
  events: AuditEvent[];
  users: User[];
  selectedEventId: string | null;
  onSelect: (event: AuditEvent) => void;
}

export function AuditEventList({
  events,
  users,
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

        return (
          <li key={event.id}>
            <button
              type="button"
              className={`audit-event-row${selectedEventId === event.id ? ' selected' : ''}`}
              onClick={() => onSelect(event)}
            >
              <span className="audit-event-time mono">
                {formatAuditTimestamp(event.timestamp)}
              </span>
              <span className="audit-event-outcome">
                {getOutcomeLabel(event.outcome)}
              </span>
              <span className="audit-event-detail">
                {event.eventType === 'scope_rule_changed' ? (
                  <>
                    Scope:{' '}
                    {actionType
                      ? getActionTypeLabel(actionType)
                      : 'rule updated'}
                  </>
                ) : (
                  <>
                    {actionType ? getActionTypeLabel(actionType) : 'Action'}
                    {target ? ` · ${target.displayName}` : ''}
                  </>
                )}
              </span>
              <span className="audit-event-actor">
                {actor?.name ?? 'Unknown'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
