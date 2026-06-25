import type { QueueItem, CrmRecord } from '../../types';
import { getActionTypeLabel } from '../../store/useAppStore';
import { formatRelativeTime } from '../../lib/format';

interface AwaitingApprovalListProps {
  items: QueueItem[];
  records: CrmRecord[];
  selectedId: string | null;
  onSelect: (item: QueueItem) => void;
}

export function AwaitingApprovalList({
  items,
  records,
  selectedId,
  onSelect,
}: AwaitingApprovalListProps) {
  void records;

  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="audit-event-list">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={`event-log-row${selectedId === item.id ? ' selected' : ''}`}
            onClick={() => onSelect(item)}
          >
            <span className="event-outcome rule-updated">AWAITING APPROVAL</span>
            <span className="event-action-type">
              {getActionTypeLabel(item.actionType)}
            </span>
            <span className="event-description">
              {item.targetRecord.displayName}
            </span>
            <span className="event-actor">—</span>
            <span className="event-timestamp">
              {formatRelativeTime(item.generatedAt)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
