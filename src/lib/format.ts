import type { CrmRecord, QueueItem } from '../types';
import type { OutreachDraftContent } from '../types';

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date('2026-06-23T12:00:00.000Z');
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getRecordSummary(
  item: QueueItem,
  records: CrmRecord[],
): string {
  const record = records.find((r) => r.id === item.targetRecord.id);
  if (!record) return item.targetRecord.type;

  const parts: string[] = [];
  if (record.dealStage) parts.push(record.dealStage);
  if (record.contactType) parts.push(record.contactType);
  parts.push(`Last activity ${formatRelativeTime(record.lastActivity)}`);

  return parts.join(' · ');
}

export function getActionChannelLabel(item: QueueItem): string {
  if (item.actionType === 'outreach_draft' && item.draftContent) {
    const draft = item.draftContent as OutreachDraftContent;
    return draft.channel === 'linkedin' ? 'LinkedIn' : 'Email';
  }
  return '';
}

export function getRejectionLabel(reason: string): string {
  const labels: Record<string, string> = {
    wrong_contact: 'Wrong contact',
    wrong_tone: 'Wrong tone',
    wrong_timing: 'Wrong timing',
    relationship_sensitivity: 'Relationship sensitivity',
    data_stale: 'Data is stale',
    other: 'Other',
  };
  return labels[reason] ?? reason;
}

export function isOutreachContent(
  content: unknown,
): content is OutreachDraftContent {
  return (
    typeof content === 'object' &&
    content !== null &&
    'channel' in content &&
    'body' in content
  );
}

export function outreachToText(content: OutreachDraftContent): string {
  if (content.subject) {
    return `Subject: ${content.subject}\n\n${content.body}`;
  }
  return content.body;
}

export function textToOutreach(
  text: string,
  original: OutreachDraftContent,
): OutreachDraftContent {
  const subjectMatch = text.match(/^Subject:\s*(.+)\n\n([\s\S]*)$/);
  if (subjectMatch && original.channel === 'email') {
    return {
      channel: 'email',
      subject: subjectMatch[1].trim(),
      body: subjectMatch[2].trim(),
    };
  }
  return { ...original, body: text.trim() };
}
