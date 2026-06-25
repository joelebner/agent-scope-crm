import { NavLink } from 'react-router-dom';
import { useAppStore, PERSONA_USER_ID_BY_ROLE } from '../../store';
import type { UserRole } from '../../types';

const NAV_ITEMS = [
  { to: '/scope', label: 'Scope Builder' },
  { to: '/queue', label: 'Review Queue', badge: true },
  { to: '/audit', label: 'Activity Audit' },
] as const;

const ROLE_LABELS: Record<UserRole, string> = {
  rep: 'Rep',
  team_lead: 'Lead',
  manager: 'Manager',
};

export function Sidebar() {
  const agent = useAppStore((s) => s.agent);
  const getPendingCount = useAppStore((s) => s.getPendingCount);
  const activeUserId = useAppStore((s) => s.activeUserId);
  const users = useAppStore((s) => s.users);
  const activeUser =
    users.find((u) => u.id === activeUserId) ??
    users.find((u) => u.id === PERSONA_USER_ID_BY_ROLE.rep)!;

  const pendingCount =
    activeUser.role === 'rep' ? getPendingCount() : getPendingCount('user-jordan');

  const agentStatusLabel =
    agent.status === 'paused' ? 'AGENT PAUSED' : 'AGENT ACTIVE';

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <h1 className="sidebar-title">Agent Scope</h1>
            <p className="sidebar-subtitle mono">
              Governance Layer • V1.0
            </p>
          </div>

          <div className="sidebar-divider" aria-hidden="true" />

          <nav className="sidebar-nav" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-link${isActive ? ' active' : ''}`
                }
              >
                <span className="nav-link-label">{item.label}</span>
                {'badge' in item && item.badge && pendingCount > 0 && (
                  <span className="nav-badge mono">
                    {String(pendingCount).padStart(2, '0')}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="nav-user">
          <div className="nav-user-avatar" aria-hidden="true" />
          <div className="nav-user-info">
            <div className="nav-user-name">
              {activeUser.name}{' '}
              <span className="nav-user-role">({ROLE_LABELS[activeUser.role]})</span>
            </div>
            <div className="nav-user-status">{agentStatusLabel}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
