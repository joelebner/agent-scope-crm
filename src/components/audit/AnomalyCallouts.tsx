import type { AuditAnomaly } from '../../lib/audit';
import { getActionTypeLabel } from '../../store/useAppStore';
import type { ActionType } from '../../types';

interface AnomalyCalloutsProps {
  anomalies: AuditAnomaly[];
  onAdjustScope?: (actionType: ActionType, dealStage?: string) => void;
}

export function AnomalyCallouts({
  anomalies,
  onAdjustScope,
}: AnomalyCalloutsProps) {
  if (anomalies.length === 0) return null;

  return (
    <div className="anomaly-callouts">
      <h3 className="section-label">Anomalies</h3>
      <div className="anomaly-grid">
        {anomalies.map((anomaly) => (
          <div key={anomaly.id} className="anomaly-card">
            <span className="anomaly-type">{anomaly.type.replace(/_/g, ' ')}</span>
            <h4 className="anomaly-title">{anomaly.title}</h4>
            <p className="anomaly-desc">{anomaly.description}</p>
            {anomaly.type === 'high_rejection' && anomaly.actionType && onAdjustScope && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  onAdjustScope(anomaly.actionType!, anomaly.dealStage)
                }
              >
                Adjust scope for {getActionTypeLabel(anomaly.actionType)}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
