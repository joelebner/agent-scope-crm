export type WritingAssistantMode =
  | 'tighten'
  | 'adjust_tone'
  | 'strengthen_opening'
  | 'suggest_alternative';

export type ToneRegister = 'formal' | 'conversational' | 'warmer';

export interface WritingAssistantContext {
  contactName: string;
  contactType: string | null;
  dealStage: string | null;
  agentReasoning: string;
  currentDraft: string;
  tone?: ToneRegister;
}

const MODE_INSTRUCTIONS: Record<WritingAssistantMode, string> = {
  tighten:
    'Tighten the rep\'s draft for clarity and concision without changing substance or tone. Return only the revised message.',
  adjust_tone:
    'Rewrite the draft to match the specified tone register. Return only the revised message.',
  strengthen_opening:
    'Rewrite only the subject line (if present) and first sentence, leaving the rest of the body intact. Return the full message with the strengthened opening.',
  suggest_alternative:
    'Generate a second full draft as a parallel alternative. Return only the alternative draft.',
};

function buildSystemPrompt(mode: WritingAssistantMode, tone?: ToneRegister): string {
  let instruction = MODE_INSTRUCTIONS[mode];
  if (mode === 'adjust_tone' && tone) {
    instruction += ` Target register: ${tone}.`;
  }

  return `You are a sales writing assistant helping a rep refine outreach messages. You respond to the rep's intent — you do not act autonomously.

${instruction}

Rules:
- Preserve factual claims from the original unless clearly wrong
- Keep the rep's voice where possible
- Do not add placeholder brackets or meta-commentary
- Return only the message text, no preamble`;
}

function buildUserPrompt(ctx: WritingAssistantContext): string {
  return `Contact: ${ctx.contactName}${ctx.contactType ? ` (${ctx.contactType})` : ''}
Deal stage: ${ctx.dealStage ?? 'Unknown'}

Agent reasoning for this recommendation:
${ctx.agentReasoning}

Rep's current draft:
${ctx.currentDraft}`;
}

export async function invokeWritingAssistant(
  mode: WritingAssistantMode,
  context: WritingAssistantContext,
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Anthropic API key not configured. Add VITE_ANTHROPIC_API_KEY to your .env file.',
    );
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildSystemPrompt(mode, context.tone),
      messages: [{ role: 'user', content: buildUserPrompt(context) }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Writing assistant request failed: ${error}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = data.content.find((block) => block.type === 'text')?.text;
  if (!text) throw new Error('No suggestion returned from writing assistant.');

  return text.trim();
}

export const ASSISTANT_MODE_LABELS: Record<WritingAssistantMode, string> = {
  tighten: 'Tighten',
  adjust_tone: 'Adjust tone',
  strengthen_opening: 'Strengthen opening',
  suggest_alternative: 'Suggest alternative',
};

export const TONE_OPTIONS: { value: ToneRegister; label: string }[] = [
  { value: 'formal', label: 'More formal' },
  { value: 'conversational', label: 'More conversational' },
  { value: 'warmer', label: 'Warmer' },
];
