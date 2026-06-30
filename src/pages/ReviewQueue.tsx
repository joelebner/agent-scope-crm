import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { QueueListRow } from '../components/queue/QueueListRow';
import { QueueDetailPane } from '../components/queue/QueueDetailPane';
import { WritingAssistantPanel } from '../components/queue/WritingAssistantPanel';
import { RejectModal } from '../components/queue/RejectModal';
import { ConfirmModal } from '../components/queue/ConfirmModal';
import { QueueEmptyState } from '../components/queue/QueueEmptyState';
import { Toast } from '../components/ui/Toast';
import type { DraftContent, QueueItem } from '../types';
import type { RejectionCategory } from '../types';
import { isOutreachContent } from '../lib/format';
import { QUEUE_APPROVE_ANIMATION_MS } from '../lib/queueAnimation';

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
  const editAndApproveQueueItem = useAppStore((s) => s.editAndApproveQueueItem);
  const rejectQueueItem = useAppStore((s) => s.rejectQueueItem);
  const setAgentEnabled = useAppStore((s) => s.setAgentEnabled);
  const resumeAgent = useAppStore((s) => s.resumeAgent);
  const setActiveUserByRole = useAppStore((s) => s.setActiveUserByRole);

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [approvingItemIds, setApprovingItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [writingHelpOpen, setWritingHelpOpen] = useState(false);

  const repId =
    activeUser.role === 'rep' ? activeUser.id : 'user-jordan';

  const pending = queueItems.filter(
    (item) => item.assignedRep === repId && item.status === 'pending',
  );

  const held = queueItems.filter(
    (item) => item.assignedRep === repId && item.status === 'held',
  );

  const listItems = [...pending, ...held];
  const selectedItem =
    listItems.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    setSelectedId((prev) => {
      if (listItems.length === 0) return null;
      if (prev && listItems.some((item) => item.id === prev)) return prev;
      return listItems[0].id;
    });
  }, [listItems]);

  useEffect(() => {
    setIsEditing(false);
    setEditSubject('');
    setEditBody('');
    setWritingHelpOpen(false);
  }, [selectedId]);

  const resetEditState = () => {
    setIsEditing(false);
    setEditSubject('');
    setEditBody('');
    setWritingHelpOpen(false);
  };

  const handleStartEdit = () => {
    if (!selectedItem?.draftContent || !isOutreachContent(selectedItem.draftContent)) {
      return;
    }

    const draft = selectedItem.draftContent;
    setEditSubject(draft.channel === 'email' ? (draft.subject ?? '') : '');
    setEditBody(draft.body);
    setIsEditing(true);
  };

  const isGloballyPaused = agent.status === 'paused' && agentPauseUntil;

  const needsConfirm = (item: QueueItem) =>
    item.flags.sensitiveContact || item.flags.dataStale;

  const runApprovalWithAnimation = (itemId: string) => {
    setApprovingItemIds((prev) => new Set(prev).add(itemId));

    window.setTimeout(() => {
      approveQueueItem(itemId);
      setToast('Action approved and queued for execution.');
      setApprovingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, QUEUE_APPROVE_ANIMATION_MS);
  };

  const runEditApprovalWithAnimation = (
    itemId: string,
    editedContent: DraftContent,
  ) => {
    setApprovingItemIds((prev) => new Set(prev).add(itemId));

    window.setTimeout(() => {
      editAndApproveQueueItem(itemId, editedContent);
      setToast('Edited version approved.');
      setApprovingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, QUEUE_APPROVE_ANIMATION_MS);
  };

  const handleApproveClick = (item: QueueItem) => {
    if (approvingItemIds.has(item.id)) return;

    if (needsConfirm(item)) {
      setPendingAction({ type: 'approve', item });
    } else {
      runApprovalWithAnimation(item.id);
    }
  };

  const handleConfirmApprove = () => {
    if (pendingAction?.type === 'approve') {
      if (!approvingItemIds.has(pendingAction.item.id)) {
        runApprovalWithAnimation(pendingAction.item.id);
      }
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

  const handleRejectClick = (item: QueueItem) => {
    setWritingHelpOpen(false);
    setPendingAction({ type: 'reject', item });
  };

  const handleWritingHelpClick = () => {
    setPendingAction(null);
    setWritingHelpOpen(true);
  };

  const handleEditApprove = (content: DraftContent) => {
    if (!selectedItem || approvingItemIds.has(selectedItem.id)) return;
    resetEditState();
    runEditApprovalWithAnimation(selectedItem.id, content);
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

      {pending.length === 0 && held.length === 0 ? (
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
                    isApproving={approvingItemIds.has(item.id)}
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
                isApproving={approvingItemIds.has(selectedItem.id)}
                isEditing={isEditing}
                editSubject={editSubject}
                editBody={editBody}
                onEditSubjectChange={setEditSubject}
                onEditBodyChange={setEditBody}
                onStartEdit={handleStartEdit}
                onCancelEdit={resetEditState}
                onApprove={() => handleApproveClick(selectedItem)}
                onReject={() => handleRejectClick(selectedItem)}
                onEditApprove={handleEditApprove}
                onWritingHelpClick={handleWritingHelpClick}
              />
            ) : (
              renderDetailEmpty()
            )}
          </div>
        </div>
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

      {writingHelpOpen && selectedItem && isEditing && (
        <WritingAssistantPanel
          item={selectedItem}
          records={records}
          editSubject={editSubject}
          editBody={editBody}
          onClose={() => setWritingHelpOpen(false)}
          onAccept={(subject, body) => {
            setEditSubject(subject);
            setEditBody(body);
            setWritingHelpOpen(false);
          }}
        />
      )}

      {pendingAction?.type === 'reject' && (
        <RejectModal
          title="Confirm Rejection"
          description={`${pendingAction.item.actionType.replace(/_/g, ' ').toUpperCase()} · #Q_${pendingAction.item.id.split('-').pop()}`}
          onConfirm={handleRejectConfirm}
          onCancel={() => setPendingAction(null)}
        />
      )}

      <Toast message={toast} onClear={() => setToast(null)} />
    </>
  );
}
