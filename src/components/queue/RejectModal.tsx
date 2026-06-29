import { useEffect, useState } from 'react';
import { REJECTION_CATEGORIES } from '../../types';
import type { RejectionCategory } from '../../types';
import { getRejectionLabel } from '../../lib/format';

interface RejectModalProps {
  title: string;
  description: string;
  onConfirm: (reason: RejectionCategory, note: string) => void;
  onCancel: () => void;
}

export function RejectModal({
  title,
  description,
  onConfirm,
  onCancel,
}: RejectModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<RejectionCategory | ''>(
    '',
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReason) return;

    const form = new FormData(e.currentTarget);
    const note = (form.get('note') as string) ?? '';
    onConfirm(selectedReason, note);
  };

  return (
    <aside
      className={['rejection-panel', open ? 'open' : ''].filter(Boolean).join(' ')}
      aria-label={title}
    >
      <div className="rejection-panel-header">
        <div className="rejection-panel-eyebrow mono">{description}</div>
        <h2 className="rejection-panel-title">{title}</h2>
        <button
          type="button"
          className="rejection-panel-close"
          onClick={onCancel}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <form className="rejection-panel-form" onSubmit={handleSubmit}>
        <div className="rejection-panel-body">
          <h3 className="rejection-panel-section-label mono">Reject Reason</h3>
          <div className="rejection-options" role="radiogroup" aria-label="Reject reason">
            {REJECTION_CATEGORIES.map((category) => {
              const selected = selectedReason === category;

              return (
                <button
                  key={category}
                  type="button"
                  className={['rejection-card', selected ? 'selected' : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setSelectedReason(category)}
                  aria-pressed={selected}
                >
                  <span
                    className={['rejection-radio', selected ? 'selected' : '']
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden="true"
                  />
                  <span className="rejection-card-label">
                    {getRejectionLabel(category)}
                  </span>
                </button>
              );
            })}
          </div>

          <textarea
            id="note"
            name="note"
            className="rejection-note"
            maxLength={140}
            placeholder="Optional note (Max 140 characters)"
          />
        </div>

        <div className="rejection-panel-footer">
          <button type="button" className="btn-secondary rejection-panel-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-submit-rejection">
            Submit Rejection
          </button>
        </div>
      </form>
    </aside>
  );
}
