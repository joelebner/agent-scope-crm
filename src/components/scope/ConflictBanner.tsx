import type { ScopeRule } from '../../types';
import { getAutonomyLabel } from '../../store/useAppStore';
import { formatConditions } from '../../lib/scope';
import { AUTONOMY_RESTRICTIVENESS } from '../../types';
import type { AutonomyLevel } from '../../types';

interface ConflictBannerProps {
  conflicts: ScopeRule[][];
}

function getEffectiveLevel(group: ScopeRule[]): AutonomyLevel {
  return group.reduce((best, rule) =>
    AUTONOMY_RESTRICTIVENESS[rule.autonomyLevel] >
    AUTONOMY_RESTRICTIVENESS[best.autonomyLevel]
      ? rule
      : best,
  ).autonomyLevel;
}

export function ConflictBanner({ conflicts }: ConflictBannerProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="conflict-banner">
      <div className="conflict-banner-header">
        <strong>{conflicts.length} conflicting rule set{conflicts.length > 1 ? 's' : ''}</strong>
        <span>More restrictive level wins when conditions overlap</span>
      </div>
      <ul className="conflict-list">
        {conflicts.map((group) => {
          const effective = getEffectiveLevel(group);
          const levels = [...new Set(group.map((r) => r.autonomyLevel))];

          return (
            <li key={group.map((r) => r.id).join('-')} className="conflict-item">
              <span className="conflict-conditions">
                {formatConditions(group[0].conditions)}
              </span>
              <span className="conflict-resolution">
                {levels.map(getAutonomyLabel).join(' vs ')} →{' '}
                <strong>{getAutonomyLabel(effective)}</strong> applies
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
