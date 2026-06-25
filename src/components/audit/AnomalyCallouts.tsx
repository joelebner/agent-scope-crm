import type { ActionType } from '../../types';

interface AnomalyCalloutsProps {
  onAdjustScope?: (actionType: ActionType, dealStage?: string) => void;
}

export function AnomalyCallouts({ onAdjustScope }: AnomalyCalloutsProps) {
  return (
    <div className="anomaly-callouts">
      <div className="anomaly-grid">
        <div className="anomaly-card">
          <div className="anomaly-label">HIGH REJECTION</div>
          <div className="anomaly-heading">
            High rejection rate · Outreach Draft
          </div>
          <p className="anomaly-body">
            50% of items rejected (6/12). Consider tightening scope.
          </p>
          {onAdjustScope && (
            <button
              type="button"
              className="anomaly-action-link"
              onClick={() => onAdjustScope('outreach_draft')}
            >
              ADJUST SCOPE →
            </button>
          )}
        </div>

        <div className="anomaly-card">
          <div className="anomaly-label">REPEAT TOUCH</div>
          <div className="anomaly-heading">
            Repeated agent activity · Various deals
          </div>
          <p className="anomaly-body">
            14 agent actions on this record in the window without consolidated
            review.
          </p>
        </div>
      </div>
    </div>
  );
}
