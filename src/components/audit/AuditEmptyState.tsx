interface AuditEmptyStateProps {
  variant: 'no-events' | 'no-approval';
}

export function AuditEmptyState({ variant }: AuditEmptyStateProps) {
  if (variant === 'no-approval') {
    return (
      <div className="empty-state empty-state-compact">
        <h3>Nothing awaiting approval</h3>
        <p>
          No agent actions are blocked pending manager sign-off. Items requiring
          manager approval appear here when scope policy demands it.
        </p>
      </div>
    );
  }

  return (
    <div className="empty-state empty-state-compact">
      <h3>No events match filters</h3>
      <p>
        Try widening the date range or clearing rep, action type, or outcome
        filters to see more activity.
      </p>
    </div>
  );
}
