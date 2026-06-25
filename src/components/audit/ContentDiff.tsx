import { isOutreachContent, outreachToText, getRejectionLabel } from '../../lib/format';
import type { DraftContent } from '../../types';

interface ContentDiffProps {
  original: DraftContent;
  final: DraftContent;
}

function renderContent(content: DraftContent): string {
  if (isOutreachContent(content)) {
    return outreachToText(content);
  }
  if ('field' in content) {
    return `${content.field}: ${content.proposedValue}`;
  }
  if ('sequenceName' in content) {
    return content.sequenceName;
  }
  if ('email' in content) {
    return `${content.firstName} ${content.lastName} <${content.email}>`;
  }
  return JSON.stringify(content, null, 2);
}

export function ContentDiff({ original, final }: ContentDiffProps) {
  const originalText = renderContent(original);
  const finalText = renderContent(final);

  if (originalText === finalText) {
    return (
      <p className="audit-empty-note">No textual changes between versions.</p>
    );
  }

  return (
    <div className="content-diff">
      <div className="diff-panel">
        <h5>Original (agent)</h5>
        <pre>{originalText}</pre>
      </div>
      <div className="diff-panel diff-panel-final">
        <h5>Final (executed)</h5>
        <pre>{finalText}</pre>
      </div>
    </div>
  );
}

export function ContentBlock({
  label,
  content,
}: {
  label: string;
  content: DraftContent;
}) {
  return (
    <div className="audit-content-block">
      <h5>{label}</h5>
      <pre>{renderContent(content)}</pre>
    </div>
  );
}

export { getRejectionLabel };
