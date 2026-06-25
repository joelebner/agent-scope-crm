import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import {
  computeAuditSummary,
  filterAuditEvents,
  type AuditFilters,
  type DateRangePreset,
} from '../lib/audit';
import { AuditSummaryPanel } from '../components/audit/AuditSummaryPanel';
import { AnomalyCallouts } from '../components/audit/AnomalyCallouts';
import { AuditFiltersBar } from '../components/audit/AuditFiltersBar';
import { AuditEventList } from '../components/audit/AuditEventList';
import { AuditDrillDown } from '../components/audit/AuditDrillDown';
import { AwaitingApprovalList } from '../components/audit/AwaitingApprovalList';
import { AuditEmptyState } from '../components/audit/AuditEmptyState';
import { Toast } from '../components/ui/Toast';
import { Select } from '../components/ui/Select';
import { getActionTypeLabel } from '../store/useAppStore';
import { ACTION_TYPES } from '../types';
import type { AuditEvent, ActionType, QueueItem } from '../types';

type AuditTab = 'activity' | 'awaiting';

const PERIOD_PRESETS: DateRangePreset[] = ['7d', '30d', '90d'];

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
      <div className="audit-content">
        <div className="audit-header">
        <div className="audit-header-label mono">AI-INITIATED ACTIONS ONLY</div>
        <div className="audit-header-row">
          <h1 className="audit-heading">Activity Audit</h1>
          <div className="period-toggle">
            {PERIOD_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`period-btn${filters.preset === preset ? ' active' : ''}`}
                onClick={() => setFilters({ ...filters, preset })}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
        <div className="audit-header-divider" aria-hidden="true" />
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
            onChange={setFilters}
          />

          <AuditSummaryPanel summary={summary} />

          <AnomalyCallouts onAdjustScope={handleAdjustScope} />

          <section className="audit-events-section">
            <div className="event-log-header">
              <h3 className="event-log-section-label mono">
                EVENT LOG · {filteredEvents.length}
              </h3>
              <div className="event-log-filters">
                <Select
                  id="event-log-action-type"
                  className="event-log-filter"
                  value={filters.actionType}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      actionType: e.target.value as AuditFilters['actionType'],
                    })
                  }
                  aria-label="Filter by action type"
                >
                  <option value="all">All actions</option>
                  {ACTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {getActionTypeLabel(type)}
                    </option>
                  ))}
                </Select>
                <Select
                  id="event-log-actor"
                  className="event-log-filter"
                  value={filters.repId}
                  onChange={(e) =>
                    setFilters({ ...filters, repId: e.target.value })
                  }
                  aria-label="Filter by actor"
                >
                  <option value="all">All actors</option>
                  {users
                    .filter((u) => u.role === 'rep')
                    .map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name}
                      </option>
                    ))}
                </Select>
              </div>
            </div>
            {filteredEvents.length === 0 ? (
              <AuditEmptyState variant="no-events" />
            ) : (
              <AuditEventList
                events={filteredEvents}
                users={users}
                queueItems={queueItems}
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
              color: 'var(--color-text-secondary)',
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

      </div>

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
