import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { RoleSwitcher } from './RoleSwitcher';
import { useAppStore } from '../../store';

const PAGE_TITLES: Record<string, string> = {
  '/scope': 'Scope Builder',
  '/queue': 'Review Queue',
  '/audit': 'Activity Audit',
};

export function AppShell() {
  const location = useLocation();
  const basePath = '/' + location.pathname.split('/')[1];
  const title = PAGE_TITLES[basePath] ?? 'Agent Scope';

  const isQueuePage = basePath === '/queue';
  const isScopePage = basePath === '/scope';
  const activeUser = useAppStore((s) => s.getActiveUser());
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);
  const showReplayWizard =
    isScopePage && activeUser.role === 'team_lead';

  return (
    <div className={`app-shell${isQueuePage ? ' app-shell--queue' : ''}`}>
      <header className="topbar">
        <span className="topbar-title">{title}</span>
        <div className="topbar-actions">
          {showReplayWizard && (
            <button
              type="button"
              className="topbar-action-btn mono"
              onClick={resetOnboarding}
            >
              Replay onboarding
            </button>
          )}
          <RoleSwitcher />
        </div>
      </header>
      <div className="app-shell-body">
        <Sidebar />
        <div className="main-area">
          <main className={`page-content${isQueuePage ? ' page-content--queue' : ''}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
