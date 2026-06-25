interface QueueEmptyStateProps {
  variant: 'no-items' | 'agent-disabled' | 'agent-paused' | 'held-only';
  pauseUntil?: string | null;
  onEnableAgent?: () => void;
  onResumeAgent?: () => void;
}

export function QueueEmptyState({
  variant,
  pauseUntil,
  onEnableAgent,
  onResumeAgent,
}: QueueEmptyStateProps) {
  if (variant === 'agent-disabled') {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" aria-hidden>
          ○
        </div>
        <h3>Agent off for your account</h3>
        <p>
          You have disabled the AI agent in your personal settings. This is
          different from having no pending items — the agent is intentionally
          paused for you.
        </p>
        {onEnableAgent && (
          <button type="button" className="btn btn-primary" onClick={onEnableAgent}>
            Re-enable agent
          </button>
        )}
      </div>
    );
  }

  if (variant === 'agent-paused') {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" aria-hidden>
          ⏸
        </div>
        <h3>Agent paused</h3>
        <p>
          You paused the agent
          {pauseUntil
            ? ` until ${new Date(pauseUntil).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
            : ''}
          . No new recommendations will enter your queue until it resumes.
          Existing held items may still appear below.
        </p>
        {onResumeAgent && (
          <button type="button" className="btn btn-primary" onClick={onResumeAgent}>
            Resume agent now
          </button>
        )}
      </div>
    );
  }

  if (variant === 'held-only') {
    return (
      <div className="empty-state empty-state-compact">
        <h3>No pending items</h3>
        <p>
          Nothing needs triage right now. Check the held section below for
          actions queued outside your active hours.
        </p>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden>
        ✓
      </div>
      <h3>Queue clear</h3>
      <p>
        No pending AI actions need your review. The agent is active — new
        recommendations will appear here when they require your approval.
      </p>
    </div>
  );
}
