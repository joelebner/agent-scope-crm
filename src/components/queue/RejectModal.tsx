import { REJECTION_CATEGORIES } from '../../types';
import type { RejectionCategory } from '../../types';
import { getRejectionLabel } from '../../lib/format';
import { Select } from '../ui/Select';

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
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const reason = form.get('reason') as RejectionCategory;
    const note = (form.get('note') as string) ?? '';
    onConfirm(reason, note);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{description}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reason">Rejection reason</label>
            <Select id="reason" name="reason" required defaultValue="" fullWidth>
              <option value="" disabled>
                Select a reason
              </option>
              {REJECTION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {getRejectionLabel(cat)}
                </option>
              ))}
            </Select>
          </div>
          <div className="form-group">
            <label htmlFor="note">Note (optional)</label>
            <textarea
              id="note"
              name="note"
              maxLength={140}
              placeholder="Brief context for the team lead"
            />
            <div className="char-count">140 characters max</div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger">
              Reject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
