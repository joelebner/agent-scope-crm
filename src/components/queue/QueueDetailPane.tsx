import { useEffect, useState } from 'react';
import type { QueueItem } from '../../types';
import type { CrmRecord, DraftContent } from '../../types';
import { useAppStore } from '../../store';
import {
  formatRelativeTime,
  isOutreachContent,
  outreachToText,
  textToOutreach,
} from '../../lib/format';
import { WritingAssistant } from './WritingAssistant';
import { ApprovalCheckIcon } from './ApprovalCheckIcon';

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
  isApproving?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEditedApproved?: () => void;
}

export function QueueDetailPane({
  item,
  records,
  isApproving = false,
  onApprove,
  onReject,
  onEditedApproved,
}: QueueDetailPaneProps) {
  const editAndApproveQueueItem = useAppStore((s) => s.editAndApproveQueueItem);
  const record = records.find((r) => r.id === item.targetRecord.id);
  const isPending = item.status === 'pending';
  const isHeld = item.status === 'held';
  const draft = item.draftContent;
  const isOutreachDraft =
    isPending && item.actionType === 'outreach_draft' && isOutreachContent(draft);

  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [showWritingHelp, setShowWritingHelp] = useState(false);

  useEffect(() => {
    setIsEditing(false);
    setEditSubject('');
    setEditBody('');
    setShowWritingHelp(false);
  }, [item.id]);

  const openEditMode = () => {
    if (!draft || !isOutreachContent(draft)) return;

    setEditSubject(draft.channel === 'email' ? (draft.subject ?? '') : '');
    setEditBody(draft.body);
    setShowWritingHelp(false);
    setIsEditing(true);
  };

  const closeEditMode = () => {
    setIsEditing(false);
    setEditSubject('');
    setEditBody('');
    setShowWritingHelp(false);
  };

  const buildEditedContent = (): DraftContent | null => {
    if (!draft || !isOutreachContent(draft)) return null;

    if (draft.channel === 'email') {
      return { channel: 'email', subject: editSubject, body: editBody };
    }
    return { channel: 'linkedin', body: editBody };
  };

  const handleApproveEdited = () => {
    const edited = buildEditedContent();
    if (!edited) return;

    editAndApproveQueueItem(item.id, edited);
    closeEditMode();
    onEditedApproved?.();
  };

  const handleAcceptSuggestion = (text: string) => {
    if (!draft || !isOutreachContent(draft)) return;

    if (draft.channel === 'email') {
      const parsed = textToOutreach(text, draft);
      setEditSubject(parsed.subject ?? '');
      setEditBody(parsed.body);
    } else {
      setEditBody(text);
    }
  };

  const currentDraftText =
    draft && isOutreachContent(draft)
      ? outreachToText(
          draft.channel === 'email'
            ? { channel: 'email', subject: editSubject, body: editBody }
            : { channel: 'linkedin', body: editBody },
        )
      : '';

  const renderDraftCard = () => {
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

    if (isEditing && isOutreachContent(draft)) {
      return (
        <section className="queue-detail-draft-section">
          <div className="editing-draft-card">
            <div className="editing-draft-header">
              <span className="queue-detail-draft-label mono">Editing Draft</span>
            </div>
            <div className="editing-draft-fields">
              {draft.channel === 'email' && (
                <input
                  className="edit-subject"
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  aria-label="Email subject"
                />
              )}
              {draft.channel === 'email' && (
                <div className="edit-divider" aria-hidden="true" />
              )}
              <textarea
                className="edit-body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={8}
                aria-label="Draft body"
              />
              <div className="writing-help-trigger">
                <button
                  type="button"
                  className="writing-help-link mono"
                  onClick={() => setShowWritingHelp((open) => !open)}
                >
                  Get writing help →
                </button>
              </div>
              {showWritingHelp && (
                <WritingAssistant
                  compact
                  contactName={item.targetRecord.displayName}
                  contactType={record?.contactType ?? null}
                  dealStage={record?.dealStage ?? null}
                  agentReasoning={item.agentReasoning}
                  currentDraft={currentDraftText}
                  onAccept={handleAcceptSuggestion}
                />
              )}
            </div>
          </div>
        </section>
      );
    }

    if (isOutreachContent(draft)) {
      return (
        <section className="queue-detail-draft-section">
          <div className="queue-detail-draft-header">
            <span className="queue-detail-draft-label mono">Draft Content</span>
            {isOutreachDraft && (
              <button
                type="button"
                className="edit-draft-link"
                onClick={openEditMode}
              >
                EDIT
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
  };

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
            <div className="queue-detail-title-row">
              <h2 className="queue-detail-title">{item.targetRecord.displayName}</h2>
              {isApproving && <ApprovalCheckIcon />}
            </div>
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

        {renderDraftCard()}

        <div className="queue-detail-divider" aria-hidden="true" />

        {isPending && (
          <div
            className={[
              'queue-detail-actions',
              isApproving ? 'approving' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="action-button-group">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    className="queue-detail-approve"
                    onClick={handleApproveEdited}
                  >
                    Approve Edited Version
                  </button>
                  <button
                    type="button"
                    className="queue-detail-btn-cancel"
                    onClick={closeEditMode}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="queue-detail-approve"
                    onClick={onApprove}
                    disabled={isApproving}
                  >
                    Approve &amp; Execute
                  </button>
                  <button
                    type="button"
                    className="queue-detail-btn-reject"
                    onClick={onReject}
                    disabled={isApproving}
                  >
                    Reject
                  </button>
                </>
              )}
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
