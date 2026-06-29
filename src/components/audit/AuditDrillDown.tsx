import type { AuditEvent, QueueItem, User } from '../../types';
import type { ActionType } from '../../types';
import { useAppStore, getActionTypeLabel, getAutonomyLabel } from '../../store';
import { getRecordSummary } from '../../lib/format';
import { formatAuditTimestamp, getOutcomeLabel } from '../../lib/audit';
import { ContentDiff, ContentBlock, getRejectionLabel } from './ContentDiff';
import { RejectModal } from '../queue/RejectModal';
import { useState } from 'react';
import type { RejectionCategory } from '../../types';
import type { CrmRecord } from '../../types';

interface AuditDrillDownProps {
  event: AuditEvent | null;
  queueItem: QueueItem | null;
  users: User[];
  records: CrmRecord[];
  isManager: boolean;
  onClose: () => void;
  onAdjustScope: (actionType: ActionType, dealStage?: string) => void;
}

export function AuditDrillDown({
  event,
  queueItem,
  users,
  records,
  isManager,
  onClose,
  onAdjustScope,
}: AuditDrillDownProps) {
  const approveManagerItem = useAppStore((s) => s.approveManagerItem);
  const denyManagerItem = useAppStore((s) => s.denyManagerItem);
  const [showDeny, setShowDeny] = useState(false);

  if (!event) return null;

  const actor = users.find((u) => u.id === event.actorId);
  const actionType = event.metadata.actionType as ActionType | undefined;

  const handleDeny = (reason: RejectionCategory, note: string) => {
    if (queueItem) {
      denyManagerItem(queueItem.id, reason, note || undefined);
      setShowDeny(false);
      onClose();
    }
  };

  const isAwaitingApproval =
    queueItem?.status === 'awaiting_manager_approval' && isManager;

  return (
    <div className="audit-drilldown-overlay" onClick={onClose}>
      <div className="audit-drilldown" onClick={(e) => e.stopPropagation()}>
        <div className="audit-drilldown-header">
          <div>
            <span className="audit-drilldown-outcome">
              {getOutcomeLabel(event.outcome)}
            </span>
            <h3>
              {event.eventType === 'scope_rule_changed'
                ? 'Scope rule change'
                : actionType
                  ? getActionTypeLabel(actionType)
                  : 'Agent action'}
            </h3>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="audit-drilldown-body">
          <dl className="audit-meta-grid">
            <div>
              <dt>When</dt>
              <dd>{formatAuditTimestamp(event.timestamp)}</dd>
            </div>
            <div>
              <dt>Actor</dt>
              <dd>
                {actor?.name} ({actor?.role.replace('_', ' ')})
              </dd>
            </div>
            {queueItem && (
              <>
                <div>
                  <dt>Record</dt>
                  <dd>{queueItem.targetRecord.displayName}</dd>
                </div>
                <div>
                  <dt>Context</dt>
                  <dd>{getRecordSummary(queueItem, records)}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd className="mono">{queueItem.confidenceScore}</dd>
                </div>
              </>
            )}
          </dl>

          {event.eventType === 'scope_rule_changed' && (
            <div className="audit-scope-change">
              <p>
                <strong>{actionType ? getActionTypeLabel(actionType) : 'Rule'}</strong>{' '}
                changed from{' '}
                <span className="mono">
                  {getAutonomyLabel(event.metadata.previousLevel as import('../../types').AutonomyLevel)}
                </span>{' '}
                to{' '}
                <span className="mono">
                  {getAutonomyLabel(event.metadata.newLevel as import('../../types').AutonomyLevel)}
                </span>
              </p>
            </div>
          )}

          {queueItem && (
            <>
              <div className="reasoning-block">
                <strong>Agent reasoning</strong>
                {queueItem.agentReasoning}
              </div>

              {event.outcome === 'rejected' && queueItem.rejectionReason && (
                <div className="audit-rejection-detail">
                  <strong>Rejection</strong>
                  <p>
                    {getRejectionLabel(queueItem.rejectionReason)}
                    {queueItem.rejectionNote && ` — "${queueItem.rejectionNote}"`}
                  </p>
                </div>
              )}

              {event.outcome === 'edited_approved' &&
                queueItem.draftContent &&
                queueItem.finalContent && (
                  <>
                    <h4 className="audit-subheading">Original vs. final</h4>
                    <ContentDiff
                      original={queueItem.draftContent}
                      final={queueItem.finalContent}
                    />
                  </>
                )}

              {event.outcome === 'approved' &&
                queueItem.draftContent &&
                !queueItem.editedContent && (
                  <ContentBlock
                    label="Executed content"
                    content={queueItem.draftContent}
                  />
                )}
            </>
          )}

          {isAwaitingApproval && queueItem?.draftContent && (
            <div className="audit-manager-actions">
              <h4 className="audit-subheading">Manager decision required</h4>
              <ContentBlock
                label="Proposed change"
                content={queueItem.draftContent}
              />
              <div className="queue-card-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    approveManagerItem(queueItem.id);
                    onClose();
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setShowDeny(true)}
                >
                  Deny
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="audit-drilldown-footer">
          {actionType && event.eventType === 'queue_item_resolved' && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                const record = records.find(
                  (r) => r.id === queueItem?.targetRecord.id,
                );
                onAdjustScope(actionType, record?.dealStage ?? undefined);
              }}
            >
              Adjust scope for this action type
            </button>
          )}
        </div>

        {showDeny && (
          <RejectModal
            title="Deny manager approval"
            description={
              queueItem
                ? `${queueItem.actionType.replace(/_/g, ' ').toUpperCase()} · #Q_${queueItem.id.split('-').pop()}`
                : 'MANAGER APPROVAL'
            }
            onConfirm={handleDeny}
            onCancel={() => setShowDeny(false)}
          />
        )}
      </div>
    </div>
  );
}
