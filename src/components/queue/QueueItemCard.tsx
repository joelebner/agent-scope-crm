import type { QueueItem } from '../../types';
import type { CrmRecord } from '../../types';
import { getActionTypeLabel } from '../../store/useAppStore';
import {
  getActionChannelLabel,
  getRecordSummary,
  isOutreachContent,
} from '../../lib/format';

interface QueueItemCardProps {
  item: QueueItem;
  records: CrmRecord[];
  onApprove: () => void;
  onEditApprove: () => void;
  onReject: () => void;
  selected?: boolean;
}

function ContentPreview({ item }: { item: QueueItem }) {
  if (!item.draftContent) return null;

  if (item.actionType === 'outreach_draft' && isOutreachContent(item.draftContent)) {
    const preview = item.draftContent.subject
      ? `"${item.draftContent.subject}"`
      : item.draftContent.body.slice(0, 80) + '…';
    return <div className="content-preview">{preview}</div>;
  }

  if (item.actionType === 'field_update' && 'field' in item.draftContent) {
    return (
      <div className="content-preview">
        {item.draftContent.field}: {item.draftContent.currentValue} →{' '}
        {item.draftContent.proposedValue}
      </div>
    );
  }

  if (item.actionType === 'sequence_enrollment' && 'sequenceName' in item.draftContent) {
    return (
      <div className="content-preview">
        Enroll in: {item.draftContent.sequenceName}
      </div>
    );
  }

  return null;
}

export function QueueItemCard({
  item,
  records,
  onApprove,
  onEditApprove,
  onReject,
  selected,
}: QueueItemCardProps) {
  const channel = getActionChannelLabel(item);
  const actionLabel = getActionTypeLabel(item.actionType);
  const displayLabel = channel ? `${actionLabel} — ${channel}` : actionLabel;

  return (
    <article className={`queue-card${selected ? ' selected' : ''}`}>
      {item.flags.sensitiveContact && (
        <div className="flag-banner flag-warning">
          Sensitive contact — approval requires confirmation
        </div>
      )}
      {item.flags.dataStale && (
        <div className="flag-banner flag-stale">
          CRM data may have changed since this was generated
        </div>
      )}

      <div className="queue-card-header">
        <div>
          <div className="queue-card-meta">
            <span className="action-label">{displayLabel}</span>
            <span
              className={`confidence confidence-${item.confidenceScore}`}
            >
              {item.confidenceScore}
            </span>
          </div>
          <div className="record-name">{item.targetRecord.displayName}</div>
          <div className="record-summary">
            {getRecordSummary(item, records)}
          </div>
        </div>
      </div>

      <div className="reasoning-block">
        <strong>Why the agent recommended this</strong>
        {item.agentReasoning}
      </div>

      <ContentPreview item={item} />

      <div className="queue-card-actions">
        <button type="button" className="btn btn-primary" onClick={onApprove}>
          Approve
        </button>
        {item.actionType === 'outreach_draft' && (
          <button type="button" className="btn" onClick={onEditApprove}>
            Edit &amp; Approve
          </button>
        )}
        <button type="button" className="btn btn-danger" onClick={onReject}>
          Reject
        </button>
      </div>
    </article>
  );
}
