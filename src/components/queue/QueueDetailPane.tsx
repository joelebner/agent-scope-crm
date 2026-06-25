import type { QueueItem } from '../../types';
import type { CrmRecord } from '../../types';
import { formatRelativeTime, isOutreachContent } from '../../lib/format';

function getActionTypeLabel(actionType: QueueItem['actionType']): string {
  return actionType.replace(/_/g, ' ').toUpperCase();
}

function getItemDisplayId(id: string): string {
  const suffix = id.split('-').pop() ?? id;
  const numeric = suffix.replace(/\D/g, '');
  return numeric ? numeric.padStart(2, '0').slice(-2) : suffix;
}

function getConfidenceValue(score: QueueItem['confidenceScore']): string {
  const map = { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };
  return map[score];
}

interface QueueDetailPaneProps {
  item: QueueItem;
  records: CrmRecord[];
  onApprove: () => void;
  onEdit: () => void;
  onReject: () => void;
}

function DraftContentCard({
  item,
  onEdit,
}: {
  item: QueueItem;
  onEdit: () => void;
}) {
  const draft = item.draftContent;
  const isPending = item.status === 'pending';
  const canEdit = isPending && item.actionType === 'outreach_draft';

  if (!draft) {
    return (
      <section className="queue-detail-draft-section">
        <div className="queue-detail-draft-header">
          <span className="queue-detail-draft-label mono">Draft Content</span>
        </div>
        <div className="queue-detail-draft-box">
          <p className="queue-detail-draft-empty">No draft content available.</p>
        </div>
      </section>
    );
  }

  if (isOutreachContent(draft)) {
    return (
      <section className="queue-detail-draft-section">
        <div className="queue-detail-draft-header">
          <span className="queue-detail-draft-label mono">Draft Content</span>
          {canEdit && (
            <button type="button" className="queue-edit-source mono" onClick={onEdit}>
              Edit Source
            </button>
          )}
        </div>
        <div className="queue-detail-draft-box">
          {draft.channel === 'email' && draft.subject && (
            <>
              <div className="queue-detail-draft-subject">{draft.subject}</div>
              <div className="queue-detail-draft-divider" aria-hidden="true" />
            </>
          )}
          <div className="queue-detail-draft-body">{draft.body}</div>
        </div>
      </section>
    );
  }

  if ('field' in draft) {
    return (
      <section className="queue-detail-draft-section">
        <div className="queue-detail-draft-header">
          <span className="queue-detail-draft-label mono">Proposed Change</span>
        </div>
        <div className="queue-detail-draft-box">
          <div className="queue-detail-draft-body">
            <strong>{draft.field}</strong>
            <br />
            {draft.currentValue} → {draft.proposedValue}
          </div>
        </div>
      </section>
    );
  }

  if ('sequenceName' in draft) {
    return (
      <section className="queue-detail-draft-section">
        <div className="queue-detail-draft-header">
          <span className="queue-detail-draft-label mono">Sequence Enrollment</span>
        </div>
        <div className="queue-detail-draft-box">
          <div className="queue-detail-draft-body">{draft.sequenceName}</div>
        </div>
      </section>
    );
  }

  return null;
}

export function QueueDetailPane({
  item,
  records,
  onApprove,
  onEdit,
  onReject,
}: QueueDetailPaneProps) {
  const record = records.find((r) => r.id === item.targetRecord.id);
  const isPending = item.status === 'pending';
  const isHeld = item.status === 'held';

  return (
    <div className="queue-detail-pane">
      <div className="queue-detail-content">
        {item.flags.sensitiveContact && (
          <div className="sensitive-banner">
            <div className="sensitive-label">SENSITIVE CONTACT</div>
            <div className="sensitive-body">
              This contact is marked sensitive in CRM. Approval requires explicit confirmation.
            </div>
          </div>
        )}
        {item.flags.dataStale && (
          <div className="stale-banner">
            <div className="stale-label">STALE DATA</div>
            <div className="stale-body">
              CRM data has changed since this recommendation was generated. Verify before approving.
            </div>
          </div>
        )}
        {isHeld && (
          <div className="held-banner">
            <div className="held-label">HELD</div>
            <div className="held-body">
              Generated during your blackout period. This item will move to your pending queue when
              your active hours resume.
            </div>
          </div>
        )}

        <header className="queue-detail-header">
          <div className="queue-detail-header-main">
            <div className="queue-detail-meta mono">
              {getActionTypeLabel(item.actionType)} · {getItemDisplayId(item.id)}
            </div>
            <h2 className="queue-detail-title">{item.targetRecord.displayName}</h2>
            <p className="queue-detail-subtitle mono">
              Contact · Generated {formatRelativeTime(item.generatedAt)}
            </p>
          </div>
          <div className="queue-detail-confidence">
            <span className="queue-detail-confidence-label mono">Confidence</span>
            <span className="queue-detail-confidence-value mono">
              {getConfidenceValue(item.confidenceScore)}
            </span>
          </div>
        </header>

        <div className="queue-detail-divider queue-detail-divider--header" aria-hidden="true" />

        <section className="queue-detail-logic">
          <div className="queue-detail-logic-aside">
            <div className="queue-detail-logic-label-row">
              <span className="queue-detail-logic-label mono">Agent Logic</span>
              <span className="queue-detail-logic-rule" aria-hidden="true" />
            </div>
          </div>
          <p className="queue-detail-logic-text">{item.agentReasoning}</p>
        </section>

        <div className="queue-detail-divider" aria-hidden="true" />

        <DraftContentCard item={item} onEdit={onEdit} />

        <div className="queue-detail-divider" aria-hidden="true" />

        {isPending && (
          <div className="queue-detail-actions">
            <button
              type="button"
              className="queue-detail-approve"
              onClick={onApprove}
            >
              Approve &amp; Execute
            </button>
            <div className="queue-detail-secondary-actions">
              {item.actionType === 'outreach_draft' && (
                <button
                  type="button"
                  className="queue-detail-btn-secondary"
                  onClick={onEdit}
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                className="queue-detail-btn-secondary queue-detail-btn-reject"
                onClick={onReject}
              >
                Reject
              </button>
            </div>
          </div>
        )}

        <div className="queue-detail-metadata-block">
          <div className="queue-detail-divider queue-detail-divider--metadata" aria-hidden="true" />
          <div className="queue-detail-metadata">
            <div className="queue-metadata-box">
              <span className="queue-metadata-label mono">Deal Stage</span>
              <span className="queue-metadata-value">
                {record?.dealStage ?? '—'}
              </span>
            </div>
            <div className="queue-metadata-box">
              <span className="queue-metadata-label mono">Contact Type</span>
              <span className="queue-metadata-value">
                {record?.contactType ?? '—'}
              </span>
            </div>
            <div className="queue-metadata-box">
              <span className="queue-metadata-label mono">Last Activity</span>
              <span className="queue-metadata-value">
                {record ? formatRelativeTime(record.lastActivity) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
