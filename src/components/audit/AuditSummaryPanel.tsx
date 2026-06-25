import type { AuditSummary } from '../../lib/audit';
import { getActionTypeLabel } from '../../store/useAppStore';
import type { ActionType } from '../../types';

interface AuditSummaryProps {
  summary: AuditSummary;
}

function StatTile({
  label,
  value,
  sub,
  rejected,
}: {
  label: string;
  value: number | string;
  sub?: string;
  rejected?: boolean;
}) {
  return (
    <div className={`stat-tile${rejected ? ' rejected' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function RejectionBar({
  actionType,
  rate,
  total,
}: {
  actionType: ActionType;
  rate: number;
  total: number;
}) {
  const pct = Math.round(rate * 100);
  const isHighRejection = rate > 0.4;

  return (
    <div className="rejection-bar-row">
      <span className="rejection-bar-label">
        {getActionTypeLabel(actionType)}
      </span>
      <div className="rejection-bar-track">
        <div
          className={`rejection-bar-fill${isHighRejection ? ' rejection-bar-fill--high' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="rejection-bar-pct mono">{pct}%</span>
      <span className="rejection-bar-count mono">{total}</span>
    </div>
  );
}

export function AuditSummaryPanel({ summary }: AuditSummaryProps) {
  const approvedTotal =
    summary.outcomes.approved + summary.outcomes.edited_approved;
  const editedSub =
    summary.outcomes.edited_approved > 0
      ? `${summary.outcomes.edited_approved} edited`
      : undefined;

  return (
    <div className="audit-summary">
      <div className="stat-tiles">
        <StatTile label="TOTAL ACTIONS" value={summary.totalActions} />
        <StatTile label="AUTO-EXECUTED" value={summary.outcomes.auto_executed} />
        <StatTile label="APPROVED" value={approvedTotal} sub={editedSub} />
        <StatTile
          label="REJECTED"
          value={summary.outcomes.rejected}
          rejected
        />
        <StatTile label="RULE CHANGES" value={summary.scopeRuleChanges} />
      </div>

      <div className="audit-summary-columns">
        <div className="audit-summary-col">
          <h4 className="audit-subheading">By action type</h4>
          <ul className="audit-breakdown-list">
            {Object.entries(summary.byActionType).map(([type, count]) => (
              <li key={type}>
                <span>{getActionTypeLabel(type as ActionType)}</span>
                <span className="mono">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="audit-summary-col">
          <h4 className="audit-subheading">Outcome split</h4>
          <ul className="audit-breakdown-list">
            <li>
              <span>Approved as-is</span>
              <span className="mono">{summary.outcomes.approved}</span>
            </li>
            <li>
              <span>Edited &amp; approved</span>
              <span className="mono">{summary.outcomes.edited_approved}</span>
            </li>
            <li>
              <span>Auto-executed</span>
              <span className="mono">{summary.outcomes.auto_executed}</span>
            </li>
            <li>
              <span>Rejected</span>
              <span className="mono">{summary.outcomes.rejected}</span>
            </li>
            <li>
              <span>Revoked</span>
              <span className="mono">{summary.outcomes.revoked}</span>
            </li>
          </ul>
        </div>

        <div className="audit-summary-col">
          <h4 className="audit-subheading">Rejection rate by type</h4>
          {summary.rejectionRates.length === 0 ? (
            <p className="audit-empty-note">No resolved actions in period.</p>
          ) : (
            <div className="rejection-bars">
              {summary.rejectionRates.map((r) => (
                <RejectionBar
                  key={r.actionType}
                  actionType={r.actionType}
                  rate={r.rate}
                  total={r.total}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
