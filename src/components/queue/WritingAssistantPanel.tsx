import { useEffect, useRef, useState } from 'react';
import type { CrmRecord, QueueItem } from '../../types';
import { isOutreachContent, parseTargetRecordDisplayName } from '../../lib/format';

function PanelChevron({ expanded }: { expanded: boolean }) {
  return (
    <span
      className={[
        'writing-assistant-chevron',
        expanded ? 'expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2.5 4.5L6 8L9.5 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

const SUBJECT_CHIPS = [
  'SHORTEN',
  'WARMER TONE',
  'MORE PROFESSIONAL',
  'PERSONALIZE',
  'SUGGEST ALTERNATIVE',
] as const;

const BODY_CHIPS = [
  'SHORTEN',
  'LENGTHEN',
  'WARMER TONE',
  'MORE PROFESSIONAL',
  'STRENGTHEN OPENING',
  'ADD CONTEXT',
  'ADD CTA',
  'SIMPLIFY',
] as const;

const CHIP_INSTRUCTIONS: Record<string, string> = {
  SHORTEN: 'Make this more concise',
  'WARMER TONE': 'Make the tone more conversational and warm',
  'MORE PROFESSIONAL': 'Make the tone more formal and professional',
  PERSONALIZE: "Personalize using the contact's name or company",
  'SUGGEST ALTERNATIVE': 'Suggest a completely different approach',
  'STRENGTHEN OPENING': 'Rewrite the opening line to be more compelling',
  'ADD CONTEXT': "Add relevant context about this contact's situation",
  'ADD CTA': 'Add a clear and specific call to action',
  LENGTHEN: 'Add more substance and detail',
  SIMPLIFY: 'Use simpler, clearer language',
};

interface PassSelection {
  subjectChips: string[];
  bodyChips: string[];
  freeText: string;
}

interface PassBlock {
  id: string;
  selection: PassSelection;
  status: 'loading' | 'complete' | 'error';
  result?: { subject: string; body: string };
  instruction: string;
  subjectAtRequest: string;
  bodyAtRequest: string;
}

interface WritingAssistantPanelProps {
  item: QueueItem;
  records: CrmRecord[];
  editSubject: string;
  editBody: string;
  onClose: () => void;
  onAccept: (subject: string, body: string) => void;
}

function getActionTypeLabel(actionType: QueueItem['actionType']): string {
  return actionType.replace(/_/g, ' ').toUpperCase();
}

function getItemDisplayId(id: string): string {
  const suffix = id.split('-').pop() ?? id;
  const numeric = suffix.replace(/\D/g, '');
  return numeric ? numeric.padStart(2, '0').slice(-2) : suffix;
}

function chipToInstruction(chip: string): string {
  return CHIP_INSTRUCTIONS[chip] ?? chip;
}

function buildInstruction(
  subjectChips: string[],
  bodyChips: string[],
  freeText: string,
): string {
  const parts: string[] = [];
  if (subjectChips.length > 0) {
    parts.push(
      `For the subject line: ${subjectChips.map(chipToInstruction).join('. ')}.`,
    );
  }
  if (bodyChips.length > 0) {
    parts.push(
      `For the body: ${bodyChips.map(chipToInstruction).join('. ')}.`,
    );
  }
  if (freeText.trim()) {
    parts.push(`Additional instruction: ${freeText.trim()}`);
  }
  return parts.join(' ');
}

function parseApiResponse(
  text: string,
  fallbackSubject: string,
  fallbackBody: string,
): { subject: string; body: string } {
  const subjectMatch = text.match(/SUBJECT:\s*(.+)/);
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/);
  return {
    subject: subjectMatch ? subjectMatch[1].trim() : fallbackSubject,
    body: bodyMatch ? bodyMatch[1].trim() : fallbackBody,
  };
}

function toggleChip(
  current: Set<string>,
  chip: string,
  setter: (next: Set<string>) => void,
) {
  const next = new Set(current);
  if (next.has(chip)) {
    next.delete(chip);
  } else {
    next.add(chip);
  }
  setter(next);
}

export function WritingAssistantPanel({
  item,
  records,
  editSubject,
  editBody,
  onClose,
  onAccept,
}: WritingAssistantPanelProps) {
  const record = records.find((r) => r.id === item.targetRecord.id);
  const draft = item.draftContent;
  const isEmail =
    draft && isOutreachContent(draft) && draft.channel === 'email';

  const originalSubject =
    draft && isOutreachContent(draft) && draft.channel === 'email'
      ? (draft.subject ?? '')
      : '';
  const originalBody =
    draft && isOutreachContent(draft) ? draft.body : '';

  const { jobTitle } = parseTargetRecordDisplayName(item.targetRecord.displayName);
  const contactParts = item.targetRecord.displayName.split(' · ');
  const contactName = contactParts[0] ?? item.targetRecord.displayName;
  const contactTitle = contactParts[1] ?? jobTitle ?? '';
  const company = contactParts[2] ?? '';

  const [open, setOpen] = useState(false);
  const [originalExpanded, setOriginalExpanded] = useState(false);
  const [subjectSectionExpanded, setSubjectSectionExpanded] = useState(true);
  const [bodySectionExpanded, setBodySectionExpanded] = useState(true);
  const [selectedSubjectChips, setSelectedSubjectChips] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedBodyChips, setSelectedBodyChips] = useState<Set<string>>(
    () => new Set(),
  );
  const [freeText, setFreeText] = useState('');
  const [passes, setPasses] = useState<PassBlock[]>([]);
  const [workingSubject, setWorkingSubject] = useState(editSubject);
  const [workingBody, setWorkingBody] = useState(editBody);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const panelBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    setWorkingSubject(editSubject);
    setWorkingBody(editBody);
  }, [editSubject, editBody]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  const scrollToResultCard = (passId: string) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const scrollContainer = panelBodyRef.current;
        const resultCard = scrollContainer?.querySelector(
          `[data-pass-id="${passId}"] .writing-assistant-result-card`,
        );
        if (!scrollContainer || !resultCard) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const cardRect = resultCard.getBoundingClientRect();
        scrollContainer.scrollTo({
          top:
            scrollContainer.scrollTop +
            (cardRect.top - containerRect.top) -
            24,
          behavior: 'smooth',
        });
      });
    });
  };

  const buildSystemPrompt = (currentSubject: string, currentBody: string) =>
    `You are a sales writing assistant helping a rep improve an outreach draft. You will receive instructions and must rewrite both the subject line and body accordingly.

Contact: ${contactName}, ${contactTitle}${company ? ` at ${company}` : ''}.
Deal stage: ${record?.dealStage ?? 'Unknown'}.
Contact type: ${record?.contactType ?? 'Unknown'}.
Agent reasoning: ${item.agentReasoning}.

Current subject line: ${currentSubject}
Current body: ${currentBody}

Respond with ONLY the rewritten draft in this exact format:
SUBJECT: [rewritten subject line]
BODY: [rewritten body]

No preamble, no explanation, no other text.`;

  const fetchRewrite = async (
    instruction: string,
    currentSubject: string,
    currentBody: string,
  ) => {
    const response = await fetch('/api/writing-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: buildSystemPrompt(currentSubject, currentBody),
        messages: [{ role: 'user', content: instruction }],
      }),
    });

    if (!response.ok) {
      throw new Error('Request failed');
    }

    const data = await response.json();
    const text = data.content?.[0]?.text as string | undefined;
    if (!text) {
      throw new Error('No response text');
    }

    return parseApiResponse(text, currentSubject, currentBody);
  };

  const runPass = async (
    passId: string,
    instruction: string,
    subjectAtRequest: string,
    bodyAtRequest: string,
  ) => {
    try {
      const result = await fetchRewrite(
        instruction,
        subjectAtRequest,
        bodyAtRequest,
      );
      setPasses((prev) =>
        prev.map((p) =>
          p.id === passId ? { ...p, status: 'complete', result } : p,
        ),
      );
      setWorkingSubject(result.subject);
      setWorkingBody(result.body);
      scrollToResultCard(passId);
    } catch {
      setPasses((prev) =>
        prev.map((p) => (p.id === passId ? { ...p, status: 'error' } : p)),
      );
      scrollToBottom();
    }
  };

  const handleRewrite = () => {
    const subjectChips = [...selectedSubjectChips];
    const bodyChips = [...selectedBodyChips];
    const text = freeText.trim();
    const instruction = buildInstruction(subjectChips, bodyChips, freeText);

    if (!instruction || isLoading) return;

    setSelectedSubjectChips(new Set());
    setSelectedBodyChips(new Set());
    setFreeText('');

    const subjectAtRequest = workingSubject;
    const bodyAtRequest = workingBody;
    const passId = crypto.randomUUID();

    setPasses((prev) => [
      ...prev,
      {
        id: passId,
        selection: { subjectChips, bodyChips, freeText: text },
        status: 'loading',
        instruction,
        subjectAtRequest,
        bodyAtRequest,
      },
    ]);

    scrollToBottom();
    void runPass(passId, instruction, subjectAtRequest, bodyAtRequest);
  };

  const handleRetry = (pass: PassBlock) => {
    setPasses((prev) =>
      prev.map((p) =>
        p.id === pass.id ? { ...p, status: 'loading', result: undefined } : p,
      ),
    );
    void runPass(
      pass.id,
      pass.instruction,
      pass.subjectAtRequest,
      pass.bodyAtRequest,
    );
  };

  const handleAccept = () => {
    onAccept(workingSubject, workingBody);
    onClose();
  };

  const isLoading = passes.some((p) => p.status === 'loading');
  const hasCompletePass = passes.some((p) => p.status === 'complete');
  const rewriteEnabled =
    !isLoading &&
    (selectedSubjectChips.size > 0 ||
      selectedBodyChips.size > 0 ||
      freeText.trim().length > 0);
  const acceptEnabled = hasCompletePass && !isLoading;

  const latestCompletePassIndex = passes.reduce(
    (lastIndex, pass, index) =>
      pass.status === 'complete' ? index : lastIndex,
    -1,
  );

  const eyebrow = `${getActionTypeLabel(item.actionType)} · #${getItemDisplayId(item.id)}`;

  return (
    <>
      <div
        className="rejection-panel-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={['writing-assistant-panel', open ? 'open' : '']
          .filter(Boolean)
          .join(' ')}
        onClick={(e) => e.stopPropagation()}
        aria-label="Get writing help"
      >
        <div className="writing-assistant-panel-header">
          <div className="writing-assistant-panel-eyebrow mono">{eyebrow}</div>
          <h2 className="writing-assistant-panel-title">Get writing help</h2>
          <button
            type="button"
            className="writing-assistant-panel-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="writing-assistant-accordion">
          <button
            type="button"
            className="writing-assistant-accordion-trigger"
            onClick={() => setOriginalExpanded((v) => !v)}
            aria-expanded={originalExpanded}
          >
            <PanelChevron expanded={originalExpanded} />
            <span>Original draft</span>
          </button>
          {originalExpanded && (
            <div className="writing-assistant-accordion-content">
              {isEmail && (
                <div className="edit-subject writing-assistant-readonly">
                  {originalSubject}
                </div>
              )}
              <div className="edit-body writing-assistant-readonly writing-assistant-original-body">
                {originalBody}
              </div>
            </div>
          )}
        </div>

        <div className="writing-assistant-panel-body" ref={panelBodyRef}>
          <div className="writing-assistant-session-log">
            {passes.map((pass, index) => (
              <div
                key={pass.id}
                className="writing-assistant-pass-block"
                data-pass-id={pass.id}
              >
                <SelectionRecord
                  selection={pass.selection}
                  showSubject={Boolean(isEmail)}
                />

                {pass.status === 'loading' && (
                  <div className="writing-assistant-result-card writing-assistant-result-card--loading">
                    <div className="writing-assistant-result-card-header mono">
                      Revised draft • {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="writing-assistant-result-card-panel">
                      <div className="writing-assistant-loading-label">
                        Revising draft…
                      </div>
                      <div className="writing-assistant-result-card-content">
                        {isEmail && (
                          <div className="writing-assistant-skeleton subject" />
                        )}
                        <div className="writing-assistant-skeleton body" />
                      </div>
                    </div>
                  </div>
                )}

                {pass.status === 'error' && (
                  <div className="writing-assistant-inline-error">
                    <span>Couldn&apos;t reach the writing assistant.</span>
                    <button
                      type="button"
                      className="writing-assistant-retry"
                      onClick={() => handleRetry(pass)}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {pass.status === 'complete' && pass.result && (
                  <ResultRecord
                    subject={pass.result.subject}
                    body={pass.result.body}
                    showSubject={Boolean(isEmail)}
                    passNumber={index + 1}
                    isLatest={index === latestCompletePassIndex}
                  />
                )}
              </div>
            ))}

            {!isLoading && (
            <div className="writing-assistant-input-area">
              {isEmail && (
                <div className="writing-assistant-chip-section">
                  <button
                    type="button"
                    className="writing-assistant-chip-section-trigger mono"
                    onClick={() => setSubjectSectionExpanded((v) => !v)}
                    aria-expanded={subjectSectionExpanded}
                  >
                    <PanelChevron expanded={subjectSectionExpanded} />
                    <span>Subject line</span>
                  </button>
                  {subjectSectionExpanded && (
                    <div className="writing-assistant-chip-grid">
                      {SUBJECT_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          className={[
                            'chip',
                            selectedSubjectChips.has(chip) ? 'selected' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() =>
                            toggleChip(
                              selectedSubjectChips,
                              chip,
                              setSelectedSubjectChips,
                            )
                          }
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="writing-assistant-chip-section">
                <button
                  type="button"
                  className="writing-assistant-chip-section-trigger mono"
                  onClick={() => setBodySectionExpanded((v) => !v)}
                  aria-expanded={bodySectionExpanded}
                >
                  <PanelChevron expanded={bodySectionExpanded} />
                  <span>Body</span>
                </button>
                {bodySectionExpanded && (
                  <div className="writing-assistant-chip-grid">
                    {BODY_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        className={[
                          'chip',
                          selectedBodyChips.has(chip) ? 'selected' : '',
                        ]
                          .filter(Boolean)
                            .join(' ')}
                        onClick={() =>
                          toggleChip(
                            selectedBodyChips,
                            chip,
                            setSelectedBodyChips,
                          )
                        }
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                className="writing-assistant-instruction"
                placeholder="Ask for a specific change"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && rewriteEnabled) {
                    e.preventDefault();
                    handleRewrite();
                  }
                }}
                disabled={isLoading}
              />

              <button
                type="button"
                className="btn-adjust writing-assistant-rewrite"
                onClick={handleRewrite}
                disabled={!rewriteEnabled}
              >
                Rewrite
              </button>
            </div>
            )}

            <div ref={scrollEndRef} />
          </div>
        </div>

        <div className="rejection-panel-footer writing-assistant-panel-footer">
          <button
            type="button"
            className="btn-secondary rejection-panel-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary writing-assistant-accept-btn"
            onClick={handleAccept}
            disabled={!acceptEnabled}
          >
            Accept
          </button>
        </div>
      </aside>
    </>
  );
}

function SelectionRecord({
  selection,
  showSubject,
}: {
  selection: PassSelection;
  showSubject: boolean;
}) {
  const hasSubject = showSubject && selection.subjectChips.length > 0;
  const hasBody = selection.bodyChips.length > 0;
  const hasCustom = Boolean(selection.freeText.trim());

  if (!hasSubject && !hasBody && !hasCustom) return null;

  return (
    <div className="writing-assistant-selection-record">
      {hasSubject && (
        <div className="writing-assistant-selection-group">
          <span className="writing-assistant-selection-label mono">
            Subject line
          </span>
          <div className="writing-assistant-selection-chips">
            {selection.subjectChips.map((chip) => (
              <span
                key={chip}
                className="chip selected writing-assistant-selection-chip"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      )}
      {hasBody && (
        <div className="writing-assistant-selection-group">
          <span className="writing-assistant-selection-label mono">Body</span>
          <div className="writing-assistant-selection-chips">
            {selection.bodyChips.map((chip) => (
              <span
                key={chip}
                className="chip selected writing-assistant-selection-chip"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      )}
      {hasCustom && (
        <div className="writing-assistant-selection-custom">
          Custom: {selection.freeText}
        </div>
      )}
    </div>
  );
}

function ResultRecord({
  subject,
  body,
  showSubject,
  passNumber,
  isLatest,
}: {
  subject: string;
  body: string;
  showSubject: boolean;
  passNumber: number;
  isLatest: boolean;
}) {
  const passLabel = String(passNumber).padStart(2, '0');

  const showSubjectField = showSubject || Boolean(subject.trim());

  return (
    <div
      className={[
        'writing-assistant-result-card',
        isLatest ? '' : 'writing-assistant-result-card--receded',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="writing-assistant-result-card-header mono">
        Revised draft • {passLabel}
      </div>
      <div className="writing-assistant-result-card-panel">
        <div className="writing-assistant-result-card-content">
          {showSubjectField && (
            <div className="writing-assistant-result-card-subject">{subject}</div>
          )}
          <div className="writing-assistant-result-card-body">{body}</div>
        </div>
      </div>
    </div>
  );
}
