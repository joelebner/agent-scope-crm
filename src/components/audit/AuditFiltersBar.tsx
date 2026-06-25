import type { AuditFilters, DateRangePreset } from '../../lib/audit';
import type { AuditOutcome } from '../../types';
import { getOutcomeLabel } from '../../lib/audit';
import { Select } from '../ui/Select';

interface AuditFiltersBarProps {
  filters: AuditFilters;
  onChange: (filters: AuditFilters) => void;
}

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const OUTCOMES: AuditOutcome[] = [
  'approved',
  'edited_approved',
  'rejected',
  'revoked',
  'held',
  'rule_updated',
];

export function AuditFiltersBar({
  filters,
  onChange,
}: AuditFiltersBarProps) {
  const update = (patch: Partial<AuditFilters>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <div className="filter-bar">
      <div className="audit-filter-group">
        <label htmlFor="audit-date">Period</label>
        <Select
          id="audit-date"
          value={filters.preset}
          onChange={(e) =>
            update({ preset: e.target.value as DateRangePreset })
          }
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="audit-filter-group">
        <label htmlFor="audit-outcome">Outcome</label>
        <Select
          id="audit-outcome"
          value={filters.outcome}
          onChange={(e) =>
            update({ outcome: e.target.value as AuditFilters['outcome'] })
          }
        >
          <option value="all">All outcomes</option>
          {OUTCOMES.map((outcome) => (
            <option key={outcome} value={outcome}>
              {getOutcomeLabel(outcome)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
