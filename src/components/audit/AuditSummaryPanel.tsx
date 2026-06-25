import type { AuditSummary } from '../../lib/audit';
import { getActionTypeLabel } from '../../store/useAppStore';
import type { ActionType } from '../../types';

interface AuditSummaryProps {
  summary: AuditSummary;
  dateLabel: string;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="audit-stat-card">
      <span className="audit-stat-label">{label}</span>
      <span className="audit-stat-value">{value}</span>
      {sub && <span className="audit-stat-sub">{sub}</span>}
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

  return (
    <div className="rejection-bar-row">
      <span className="rejection-bar-label">
        {getActionTypeLabel(actionType)}
      </span>
      <div className="rejection-bar-track">
        <div
          className="rejection-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="rejection-bar-pct mono">{pct}%</span>
      <span className="rejection-bar-count mono">{total}</span>
    </div>
  );
}

export function AuditSummaryPanel({ summary, dateLabel }: AuditSummaryProps) {
  const outcomeTotal =
    summary.outcomes.approved +
    summary.outcomes.edited_approved +
    summary.outcomes.rejected +
    summary.outcomes.auto_executed +
    summary.outcomes.revoked;

  return (
    <div className="audit-summary">
      <div className="audit-summary-header">
        <h3 className="section-label">Summary — {dateLabel}</h3>
      </div>

      <div className="audit-stat-grid">
        <StatCard label="Total agent actions" value={summary.totalActions} />
        <StatCard
          label="Scope rule changes"
          value={summary.scopeRuleChanges}
        />
        <StatCard
          label="Approval rate"
          value={
            outcomeTotal > 0
              ? `${Math.round(((summary.outcomes.approved + summary.outcomes.edited_approved + summary.outcomes.auto_executed) / outcomeTotal) * 100)}%`
              : '—'
          }
          sub="Approved + edited + auto"
        />
        <StatCard
          label="Rejections"
          value={summary.outcomes.rejected}
          sub={
            outcomeTotal > 0
              ? `${Math.round((summary.outcomes.rejected / outcomeTotal) * 100)}% of resolved`
              : undefined
          }
        />
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
