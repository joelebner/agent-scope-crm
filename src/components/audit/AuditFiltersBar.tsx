import type { AuditFilters, DateRangePreset } from '../../lib/audit';
import { ACTION_TYPES } from '../../types';
import { getActionTypeLabel } from '../../store/useAppStore';
import type { User } from '../../types';
import type { AuditOutcome } from '../../types';
import { getOutcomeLabel } from '../../lib/audit';
import { Select } from '../ui/Select';

interface AuditFiltersBarProps {
  filters: AuditFilters;
  users: User[];
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
  users,
  onChange,
}: AuditFiltersBarProps) {
  const reps = users.filter((u) => u.role === 'rep');

  const update = (patch: Partial<AuditFilters>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <div className="audit-filters">
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
        <label htmlFor="audit-rep">Rep</label>
        <Select
          id="audit-rep"
          value={filters.repId}
          onChange={(e) => update({ repId: e.target.value })}
        >
          <option value="all">All reps</option>
          {reps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="audit-filter-group">
        <label htmlFor="audit-type">Action type</label>
        <Select
          id="audit-type"
          value={filters.actionType}
          onChange={(e) =>
            update({
              actionType: e.target.value as AuditFilters['actionType'],
            })
          }
        >
          <option value="all">All types</option>
          {ACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {getActionTypeLabel(type)}
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
