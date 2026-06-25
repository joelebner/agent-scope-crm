import { useState } from 'react';
import type { QueueItem } from '../../types';
import type { CrmRecord, DraftContent } from '../../types';
import { useAppStore } from '../../store';
import { isOutreachContent, outreachToText, textToOutreach } from '../../lib/format';
import { WritingAssistant } from './WritingAssistant';

interface EditApprovePanelProps {
  item: QueueItem;
  records: CrmRecord[];
  onClose: () => void;
  onApproved: () => void;
}

export function EditApprovePanel({
  item,
  records,
  onClose,
  onApproved,
}: EditApprovePanelProps) {
  const editAndApproveQueueItem = useAppStore((s) => s.editAndApproveQueueItem);
  const record = records.find((r) => r.id === item.targetRecord.id);

  const draft = item.draftContent;
  const isOutreach = isOutreachContent(draft);

  const [subject, setSubject] = useState(
    isOutreach && draft.channel === 'email' ? (draft.subject ?? '') : '',
  );
  const [body, setBody] = useState(isOutreach ? draft.body : '');

  const buildEditedContent = (): DraftContent | null => {
    if (!draft || !isOutreachContent(draft)) return null;

    if (draft.channel === 'email') {
      return { channel: 'email', subject, body };
    }
    return { channel: 'linkedin', body };
  };

  const handleApprove = () => {
    const edited = buildEditedContent();
    if (!edited) return;
    editAndApproveQueueItem(item.id, edited);
    onApproved();
  };

  const handleAcceptSuggestion = (text: string) => {
    if (!draft || !isOutreachContent(draft)) return;

    if (draft.channel === 'email') {
      const parsed = textToOutreach(text, draft);
      setSubject(parsed.subject ?? '');
      setBody(parsed.body);
    } else {
      setBody(text);
    }
  };

  const currentDraftText = isOutreach
    ? outreachToText(
        draft.channel === 'email'
          ? { channel: 'email', subject, body }
          : { channel: 'linkedin', body },
      )
    : '';

  return (
    <div className="edit-panel-overlay" onClick={onClose}>
      <div className="edit-panel" onClick={(e) => e.stopPropagation()}>
        <div className="edit-panel-header">
          <h3>Edit &amp; Approve — {item.targetRecord.displayName}</h3>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="edit-panel-body">
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--gray-60)',
              margin: '0 0 1rem',
            }}
          >
            Original draft is preserved for audit. Your edits become the
            executed version.
          </p>

          {isOutreach && draft.channel === 'email' && (
            <>
              <label className="field-label" htmlFor="edit-subject">
                Subject
              </label>
              <input
                id="edit-subject"
                className="field-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </>
          )}

          <label className="field-label" htmlFor="edit-body">
            {isOutreach && draft.channel === 'linkedin' ? 'Message' : 'Body'}
          </label>
          <textarea
            id="edit-body"
            className="field-input body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          {isOutreach && (
            <WritingAssistant
              contactName={item.targetRecord.displayName}
              contactType={record?.contactType ?? null}
              dealStage={record?.dealStage ?? null}
              agentReasoning={item.agentReasoning}
              currentDraft={currentDraftText}
              onAccept={handleAcceptSuggestion}
            />
          )}
        </div>

        <div className="edit-panel-footer">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApprove}
          >
            Approve edited version
          </button>
        </div>
      </div>
    </div>
  );
}
