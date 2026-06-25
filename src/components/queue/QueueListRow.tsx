import type { QueueItem } from '../../types';
import { formatRelativeTime } from '../../lib/format';

function getActionTypeTag(actionType: QueueItem['actionType']): string {
  return `[${actionType.toUpperCase()}]`;
}

function getConfidenceLabel(score: QueueItem['confidenceScore']): string {
  const map = {
    high: 'HIGH CONFIDENCE',
    medium: 'MED CONFIDENCE',
    low: 'LOW CONFIDENCE',
  };
  return map[score];
}

function getRowTag(item: QueueItem): string {
  if (item.flags.dataStale) return '[STALE DATA]';
  if (item.status === 'held') return '[HELD_BLACKOUT]';
  return getActionTypeTag(item.actionType);
}

interface QueueListRowProps {
  item: QueueItem;
  selected: boolean;
  onSelect: () => void;
}

export function QueueListRow({ item, selected, onSelect }: QueueListRowProps) {
  const isSensitive = item.flags.sensitiveContact;
  const isStale = item.flags.dataStale;

  return (
    <button
      type="button"
      className={[
        'queue-list-row',
        selected ? 'selected' : '',
        isSensitive ? 'sensitive' : '',
        isStale ? 'stale' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onSelect}
    >
      <div className="queue-list-row-body">
        <div className="queue-list-row-top">
          <span className="queue-list-tag mono">{getRowTag(item)}</span>
          <span className="queue-list-time mono">
            {formatRelativeTime(item.generatedAt)}
          </span>
        </div>
        <div className="queue-list-name">{item.targetRecord.displayName}</div>
        <p className="queue-list-snippet">{item.agentReasoning}</p>
      </div>
      <div className="queue-list-badges">
        <span className="queue-conf-badge mono">
          {getConfidenceLabel(item.confidenceScore)}
        </span>
        {item.flags.dataStale && (
          <span className="queue-flag-badge queue-flag-stale mono">
            STALE
          </span>
        )}
        {isSensitive && (
          <span className="queue-flag-badge queue-flag-flagged mono">
            FLAGGED
          </span>
        )}
      </div>
    </button>
  );
}
