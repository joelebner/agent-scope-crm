import type { QueueItem } from '../../types';
import type { CrmRecord } from '../../types';
import { getActionTypeLabel } from '../../store/useAppStore';
import { getRecordSummary } from '../../lib/format';

interface RevokedQueueItemCardProps {
  item: QueueItem;
  records: CrmRecord[];
}

export function RevokedQueueItemCard({
  item,
  records,
}: RevokedQueueItemCardProps) {
  return (
    <article className="queue-card queue-card-revoked">
      <div className="revoked-overlay">
        <span className="revoked-badge">Revoked by team policy</span>
      </div>
      <div className="queue-card-revoked-content">
        <div className="queue-card-meta">
          <span className="action-label">
            {getActionTypeLabel(item.actionType)}
          </span>
        </div>
        <div className="record-name">{item.targetRecord.displayName}</div>
        <div className="record-summary">
          {getRecordSummary(item, records)}
        </div>
        <p className="revoked-explanation">
          This action is no longer permitted under current scope settings. It
          has been removed from your active triage queue and logged in the
          Activity Audit.
        </p>
      </div>
    </article>
  );
}
