import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import {
  computeAuditSummary,
  detectAnomalies,
  filterAuditEvents,
  type AuditFilters,
} from '../lib/audit';
import { AuditSummaryPanel } from '../components/audit/AuditSummaryPanel';
import { AnomalyCallouts } from '../components/audit/AnomalyCallouts';
import { AuditFiltersBar } from '../components/audit/AuditFiltersBar';
import { AuditEventList } from '../components/audit/AuditEventList';
import { AuditDrillDown } from '../components/audit/AuditDrillDown';
import { AwaitingApprovalList } from '../components/audit/AwaitingApprovalList';
import { AuditEmptyState } from '../components/audit/AuditEmptyState';
import { Toast } from '../components/ui/Toast';
import type { AuditEvent, ActionType, QueueItem } from '../types';

type AuditTab = 'activity' | 'awaiting';

const DATE_LABELS = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

export function ActivityAudit() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const auditEvents = useAppStore((s) => s.auditEvents);
  const queueItems = useAppStore((s) => s.queueItems);
  const users = useAppStore((s) => s.users);
  const records = useAppStore((s) => s.records);
  const activeUser = useAppStore((s) => s.getActiveUser());
  const setScopeBuilderFilter = useAppStore((s) => s.setScopeBuilderFilter);
  const setActiveUserByRole = useAppStore((s) => s.setActiveUserByRole);

  const [filters, setFilters] = useState<AuditFilters>({
    preset: '7d',
    repId: 'all',
    actionType: 'all',
    outcome: 'all',
  });
  const [tab, setTab] = useState<AuditTab>('activity');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);

  const isManager = activeUser.role === 'manager';

  const filteredEvents = useMemo(
    () => filterAuditEvents(auditEvents, filters),
    [auditEvents, filters],
  );

  const rangeEvents = useMemo(
    () => filterAuditEvents(auditEvents, { ...filters, outcome: 'all', actionType: 'all', repId: 'all' }),
    [auditEvents, filters.preset],
  );

  const summary = useMemo(
    () => computeAuditSummary(rangeEvents, queueItems),
    [rangeEvents, queueItems],
  );

  const anomalies = useMemo(
    () => detectAnomalies(rangeEvents, queueItems, users),
    [rangeEvents, queueItems, users],
  );

  const awaitingItems = queueItems.filter(
    (item) => item.status === 'awaiting_manager_approval',
  );

  const selectedQueueItem = selectedEvent?.queueItemId
    ? queueItems.find((q) => q.id === selectedEvent.queueItemId) ?? null
    : selectedApprovalId
      ? queueItems.find((q) => q.id === selectedApprovalId) ?? null
      : null;

  const drillDownEvent: AuditEvent | null =
    selectedEvent ??
    (selectedApprovalId && selectedQueueItem
      ? {
          id: `pending-${selectedQueueItem.id}`,
          eventType: 'queue_item_resolved',
          queueItemId: selectedQueueItem.id,
          scopeRuleId: null,
          outcome: 'held',
          actorId: selectedQueueItem.assignedRep,
          actorRole: 'rep',
          timestamp: selectedQueueItem.generatedAt,
          metadata: {
            actionType: selectedQueueItem.actionType,
            targetRecord: selectedQueueItem.targetRecord,
          },
        }
      : null);

  useEffect(() => {
    if (eventId) {
      const event = auditEvents.find((e) => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
        setTab('activity');
      }
    }
  }, [eventId, auditEvents]);

  const handleSelectEvent = (event: AuditEvent) => {
    setSelectedEvent(event);
    setSelectedApprovalId(null);
    navigate(`/audit/${event.id}`);
  };

  const handleSelectApproval = (item: QueueItem) => {
    setSelectedApprovalId(item.id);
    setSelectedEvent(null);
    navigate('/audit');
  };

  const handleCloseDrillDown = () => {
    setSelectedEvent(null);
    setSelectedApprovalId(null);
    navigate('/audit');
  };

  const handleAdjustScope = (actionType: ActionType, dealStage?: string) => {
    setScopeBuilderFilter({ actionType, dealStage });
    setActiveUserByRole('team_lead');
    navigate('/scope');
    setToast('Opened Scope Builder with filter applied.');
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Activity Audit</h2>
          <p>
            AI-initiated actions across the team. Summary first, drill down on
            demand.
          </p>
        </div>
      </div>

      {isManager && (
        <div className="audit-tabs">
          <button
            type="button"
            className={`audit-tab${tab === 'activity' ? ' active' : ''}`}
            onClick={() => setTab('activity')}
          >
            Activity log
          </button>
          <button
            type="button"
            className={`audit-tab${tab === 'awaiting' ? ' active' : ''}`}
            onClick={() => setTab('awaiting')}
          >
            Awaiting approval
            {awaitingItems.length > 0 && (
              <span className="nav-badge">{awaitingItems.length}</span>
            )}
          </button>
        </div>
      )}

      {tab === 'activity' && (
        <>
          <AuditFiltersBar
            filters={filters}
            users={users}
            onChange={setFilters}
          />

          <AuditSummaryPanel
            summary={summary}
            dateLabel={DATE_LABELS[filters.preset]}
          />

          <AnomalyCallouts
            anomalies={anomalies}
            onAdjustScope={handleAdjustScope}
          />

          <section className="audit-events-section">
            <h3 className="section-label">
              Action log ({filteredEvents.length})
            </h3>
            {filteredEvents.length === 0 ? (
              <AuditEmptyState variant="no-events" />
            ) : (
              <AuditEventList
                events={filteredEvents}
                users={users}
                selectedEventId={selectedEvent?.id ?? null}
                onSelect={handleSelectEvent}
              />
            )}
          </section>
        </>
      )}

      {tab === 'awaiting' && isManager && (
        <section className="audit-events-section">
          <h3 className="section-label">
            Awaiting manager approval ({awaitingItems.length})
          </h3>
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--gray-60)',
              margin: '0 0 1rem',
            }}
          >
            Actions blocked by scope policy until you approve or deny.
          </p>
          <AwaitingApprovalList
            items={awaitingItems}
            records={records}
            selectedId={selectedApprovalId}
            onSelect={handleSelectApproval}
          />
          {awaitingItems.length === 0 && (
            <AuditEmptyState variant="no-approval" />
          )}
        </section>
      )}

      {(selectedEvent || selectedApprovalId) && (
        <AuditDrillDown
          event={drillDownEvent}
          queueItem={selectedQueueItem}
          users={users}
          records={records}
          isManager={isManager}
          onClose={handleCloseDrillDown}
          onAdjustScope={handleAdjustScope}
        />
      )}

      <Toast message={toast} onClear={() => setToast(null)} />
    </>
  );
}
