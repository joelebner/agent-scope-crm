export type UserRole = 'rep' | 'team_lead' | 'manager';

export type ActionType =
  | 'outreach_draft'
  | 'field_update'
  | 'sequence_enrollment'
  | 'contact_creation';

export type AutonomyLevel =
  | 'auto_execute'
  | 'rep_review'
  | 'manager_approval'
  | 'never';

export type ConfidenceScore = 'low' | 'medium' | 'high';

export type QueueItemStatus =
  | 'pending'
  | 'approved'
  | 'edited_approved'
  | 'rejected'
  | 'held'
  | 'revoked'
  | 'awaiting_manager_approval';

export type RejectionCategory =
  | 'wrong_contact'
  | 'wrong_tone'
  | 'wrong_timing'
  | 'relationship_sensitivity'
  | 'data_stale'
  | 'other';

export type RecordType = 'deal' | 'contact' | 'company';

export type AuditEventType = 'queue_item_resolved' | 'scope_rule_changed';

export type AuditOutcome =
  | 'approved'
  | 'edited_approved'
  | 'rejected'
  | 'held'
  | 'rule_updated'
  | 'revoked';

export type AgentStatus = 'active' | 'paused' | 'disabled';

export interface BlackoutPeriod {
  start: string;
  end: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  agentEnabled: boolean;
  blackoutPeriods: BlackoutPeriod[];
}

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
}

export interface ScopeCondition {
  dimension: 'deal_stage' | 'contact_type' | 'rep_role';
  operator: 'is' | 'is_not';
  value: string;
}

export interface ScopeRule {
  id: string;
  actionType: ActionType;
  autonomyLevel: AutonomyLevel;
  conditions: ScopeCondition[];
  createdBy: string;
  updatedAt: string;
}

export interface TargetRecord {
  type: RecordType;
  id: string;
  displayName: string;
}

export interface QueueItemFlags {
  sensitiveContact: boolean;
  heldForBlackout: boolean;
  dataStale: boolean;
}

export interface OutreachDraftContent {
  channel: 'email' | 'linkedin';
  subject?: string;
  body: string;
}

export interface FieldUpdateContent {
  field: string;
  currentValue: string;
  proposedValue: string;
}

export interface SequenceEnrollmentContent {
  sequenceName: string;
  sequenceId: string;
}

export interface ContactCreationContent {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
}

export type DraftContent =
  | OutreachDraftContent
  | FieldUpdateContent
  | SequenceEnrollmentContent
  | ContactCreationContent;

export interface QueueItem {
  id: string;
  actionType: ActionType;
  targetRecord: TargetRecord;
  agentReasoning: string;
  confidenceScore: ConfidenceScore;
  draftContent: DraftContent | null;
  editedContent: DraftContent | null;
  finalContent: DraftContent | null;
  status: QueueItemStatus;
  assignedRep: string;
  generatedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  rejectionReason: RejectionCategory | null;
  rejectionNote: string | null;
  flags: QueueItemFlags;
}

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  queueItemId: string | null;
  scopeRuleId: string | null;
  outcome: AuditOutcome;
  actorId: string;
  actorRole: UserRole;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface CrmRecord {
  id: string;
  type: RecordType;
  displayName: string;
  dealStage: string | null;
  contactType: string | null;
  lastActivity: string;
  isSensitive: boolean;
}

export interface ScopeBuilderFilter {
  actionType?: ActionType;
  dealStage?: string;
}

export const AUTONOMY_LEVELS: AutonomyLevel[] = [
  'auto_execute',
  'rep_review',
  'manager_approval',
  'never',
];

export const ACTION_TYPES: ActionType[] = [
  'outreach_draft',
  'field_update',
  'sequence_enrollment',
  'contact_creation',
];

export const REJECTION_CATEGORIES: RejectionCategory[] = [
  'wrong_contact',
  'wrong_tone',
  'wrong_timing',
  'relationship_sensitivity',
  'data_stale',
  'other',
];

export const AUTONOMY_RESTRICTIVENESS: Record<AutonomyLevel, number> = {
  never: 4,
  manager_approval: 3,
  rep_review: 2,
  auto_execute: 1,
};
