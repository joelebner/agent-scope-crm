import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { QueueListRow } from '../components/queue/QueueListRow';
import { QueueDetailPane } from '../components/queue/QueueDetailPane';
import { RevokedQueueItemCard } from '../components/queue/RevokedQueueItemCard';
import { RejectModal } from '../components/queue/RejectModal';
import { ConfirmModal } from '../components/queue/ConfirmModal';
import { QueueEmptyState } from '../components/queue/QueueEmptyState';
import { Toast } from '../components/ui/Toast';
import type { QueueItem } from '../types';
import type { RejectionCategory } from '../types';

type PendingAction =
  | { type: 'approve'; item: QueueItem }
  | { type: 'reject'; item: QueueItem }
  | null;

export function ReviewQueue() {
  const navigate = useNavigate();
  const queueItems = useAppStore((s) => s.queueItems);
  const records = useAppStore((s) => s.records);
  const agent = useAppStore((s) => s.agent);
  const agentPauseUntil = useAppStore((s) => s.agentPauseUntil);
  const activeUser = useAppStore((s) => s.getActiveUser());
  const approveQueueItem = useAppStore((s) => s.approveQueueItem);
  const rejectQueueItem = useAppStore((s) => s.rejectQueueItem);
  const setAgentEnabled = useAppStore((s) => s.setAgentEnabled);
  const resumeAgent = useAppStore((s) => s.resumeAgent);
  const setActiveUserByRole = useAppStore((s) => s.setActiveUserByRole);

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showRevoked, setShowRevoked] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const prevRevokedCount = useRef(0);

  const repId =
    activeUser.role === 'rep' ? activeUser.id : 'user-jordan';

  const pending = queueItems.filter(
    (item) => item.assignedRep === repId && item.status === 'pending',
  );

  const held = queueItems.filter(
    (item) => item.assignedRep === repId && item.status === 'held',
  );

  const revoked = queueItems.filter(
    (item) => item.assignedRep === repId && item.status === 'revoked',
  );

  const listItems = [...pending, ...held];
  const selectedItem =
    listItems.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (revoked.length > prevRevokedCount.current) {
      setShowRevoked(true);
    }
    prevRevokedCount.current = revoked.length;
  }, [revoked.length]);

  useEffect(() => {
    setSelectedId((prev) => {
      if (listItems.length === 0) return null;
      if (prev && listItems.some((item) => item.id === prev)) return prev;
      return listItems[0].id;
    });
  }, [listItems]);

  const isGloballyPaused = agent.status === 'paused' && agentPauseUntil;

  const needsConfirm = (item: QueueItem) =>
    item.flags.sensitiveContact || item.flags.dataStale;

  const handleApproveClick = (item: QueueItem) => {
    if (needsConfirm(item)) {
      setPendingAction({ type: 'approve', item });
    } else {
      approveQueueItem(item.id);
      setToast('Action approved and queued for execution.');
    }
  };

  const handleConfirmApprove = () => {
    if (pendingAction?.type === 'approve') {
      approveQueueItem(pendingAction.item.id);
      setToast('Action approved and queued for execution.');
    }
    setPendingAction(null);
  };

  const handleRejectConfirm = (reason: RejectionCategory, note: string) => {
    if (pendingAction?.type === 'reject') {
      rejectQueueItem(pendingAction.item.id, reason, note || undefined);
      setToast('Rejection recorded. Signal sent to team lead.');
    }
    setPendingAction(null);
  };

  const renderDetailEmpty = () => {
    if (pending.length > 0) return null;

    if (held.length > 0) {
      return <QueueEmptyState variant="held-only" />;
    }

    if (isGloballyPaused) {
      return (
        <QueueEmptyState
          variant="agent-paused"
          pauseUntil={agentPauseUntil}
          onResumeAgent={() => {
            resumeAgent();
            setToast('Agent resumed.');
          }}
        />
      );
    }

    return <QueueEmptyState variant="no-items" />;
  };

  if (activeUser.role !== 'rep') {
    return (
      <div className="rep-switch-hint">
        <p>
          The Review Queue is a rep workflow. Switch to Jordan (Rep) to
          process pending AI actions.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setActiveUserByRole('rep');
            navigate('/queue');
          }}
        >
          Switch to Jordan — Rep
        </button>
      </div>
    );
  }

  if (!activeUser.agentEnabled) {
    return (
      <>
        <QueueEmptyState
          variant="agent-disabled"
          onEnableAgent={() => {
            setAgentEnabled(activeUser.id, true);
            setToast('Agent re-enabled.');
          }}
        />
        <Toast message={toast} onClear={() => setToast(null)} />
      </>
    );
  }

  return (
    <>
      {isGloballyPaused && pending.length > 0 && (
        <div className="agent-paused-banner">
          <span>
            Agent paused — you can still process existing pending items. No new
            items will arrive until{' '}
            {new Date(agentPauseUntil!).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
            .
          </span>
          <button type="button" className="btn btn-sm" onClick={resumeAgent}>
            Resume
          </button>
        </div>
      )}

      {pending.length === 0 && held.length === 0 && revoked.length === 0 ? (
        renderDetailEmpty()
      ) : (
        <div className="queue-master-detail">
          <aside className="queue-list-panel">
            {pending.length > 0 && (
              <div className="queue-list-section">
                <h3 className="queue-list-section-label">
                  Pending • {pending.length}
                </h3>
                {pending.map((item) => (
                  <QueueListRow
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ))}
              </div>
            )}

            {held.length > 0 && (
              <div className="queue-list-section">
                <h3 className="queue-list-section-label">
                  Held • {held.length}
                </h3>
                {held.map((item) => (
                  <QueueListRow
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ))}
              </div>
            )}
          </aside>

          <div className="queue-detail-panel">
            {selectedItem ? (
              <QueueDetailPane
                item={selectedItem}
                records={records}
                onApprove={() => handleApproveClick(selectedItem)}
                onReject={() =>
                  setPendingAction({ type: 'reject', item: selectedItem })
                }
                onEditedApproved={() => setToast('Edited version approved.')}
              />
            ) : (
              renderDetailEmpty()
            )}
          </div>
        </div>
      )}

      {revoked.length > 0 && (
        <section className="queue-revoked-section">
          <div className="revoked-section-header">
            <h3 className="section-label">
              Revoked by policy ({revoked.length})
            </h3>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowRevoked(!showRevoked)}
            >
              {showRevoked ? 'Hide' : 'Show'}
            </button>
          </div>
          {showRevoked && (
            <div className="queue-list">
              {revoked.map((item) => (
                <RevokedQueueItemCard
                  key={item.id}
                  item={item}
                  records={records}
                />
              ))}
            </div>
          )}
          {!showRevoked && (
            <p className="revoked-collapsed-hint">
              {revoked.length} item{revoked.length > 1 ? 's' : ''} removed
              from triage after a scope change.
            </p>
          )}
        </section>
      )}

      {pendingAction?.type === 'approve' && (
        <ConfirmModal
          title={
            pendingAction.item.flags.sensitiveContact
              ? 'Approve sensitive contact?'
              : 'Approve with stale data?'
          }
          description={
            pendingAction.item.flags.sensitiveContact
              ? 'This contact is marked sensitive. Are you sure you want to approve this action?'
              : 'CRM data may have changed since this recommendation was generated. Approve anyway?'
          }
          confirmLabel="Approve anyway"
          onConfirm={handleConfirmApprove}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {pendingAction?.type === 'reject' && (
        <RejectModal
          title="Reject recommendation"
          description={`Why are you rejecting this action for ${pendingAction.item.targetRecord.displayName}?`}
          onConfirm={handleRejectConfirm}
          onCancel={() => setPendingAction(null)}
        />
      )}

      <Toast message={toast} onClear={() => setToast(null)} />
    </>
  );
}
