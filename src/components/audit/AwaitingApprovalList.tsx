import type { QueueItem, CrmRecord } from '../../types';
import { getActionTypeLabel } from '../../store/useAppStore';
import { getRecordSummary } from '../../lib/format';
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
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="audit-event-list">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={`audit-event-row${selectedId === item.id ? ' selected' : ''}`}
            onClick={() => onSelect(item)}
          >
            <span className="audit-event-time mono">
              {formatRelativeTime(item.generatedAt)}
            </span>
            <span className="audit-event-outcome">Awaiting approval</span>
            <span className="audit-event-detail">
              {getActionTypeLabel(item.actionType)} ·{' '}
              {item.targetRecord.displayName}
            </span>
            <span className="audit-event-actor">
              {getRecordSummary(item, records).split(' · ')[0]}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
