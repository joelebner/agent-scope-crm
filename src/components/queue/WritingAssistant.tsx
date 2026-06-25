import { useState } from 'react';
import {
  invokeWritingAssistant,
  ASSISTANT_MODE_LABELS,
  TONE_OPTIONS,
  type WritingAssistantMode,
  type ToneRegister,
} from '../../lib/writingAssistant';
import { Select } from '../ui/Select';

interface WritingAssistantProps {
  contactName: string;
  contactType: string | null;
  dealStage: string | null;
  agentReasoning: string;
  currentDraft: string;
  onAccept: (text: string) => void;
}

export function WritingAssistant({
  contactName,
  contactType,
  dealStage,
  agentReasoning,
  currentDraft,
  onAccept,
}: WritingAssistantProps) {
  const [mode, setMode] = useState<WritingAssistantMode>('tighten');
  const [tone, setTone] = useState<ToneRegister>('conversational');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvoke = async () => {
    if (!currentDraft.trim()) {
      setError('Add some draft text before using the writing assistant.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const result = await invokeWritingAssistant(mode, {
        contactName,
        contactType,
        dealStage,
        agentReasoning,
        currentDraft,
        tone: mode === 'adjust_tone' ? tone : undefined,
      });
      setSuggestion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assistant-section">
      <h4>Writing assistant</h4>
      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--gray-60)',
          margin: '0 0 0.75rem',
        }}
      >
        On-demand help — suggestions never auto-apply. Not logged in audit.
      </p>

      <div className="assistant-modes">
        {(Object.keys(ASSISTANT_MODE_LABELS) as WritingAssistantMode[]).map(
          (m) => (
            <button
              key={m}
              type="button"
              className={`assistant-mode-btn${mode === m ? ' selected' : ''}`}
              onClick={() => setMode(m)}
            >
              {ASSISTANT_MODE_LABELS[m]}
            </button>
          ),
        )}
      </div>

      {mode === 'adjust_tone' && (
        <div className="form-group">
          <label htmlFor="tone-select">Tone register</label>
          <Select
            id="tone-select"
            value={tone}
            onChange={(e) => setTone(e.target.value as ToneRegister)}
            fullWidth
          >
            {TONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      <button
        type="button"
        className="btn btn-sm"
        onClick={handleInvoke}
        disabled={loading}
      >
        {loading ? 'Generating…' : 'Get suggestion'}
      </button>

      {error && <p className="assistant-error">{error}</p>}

      {suggestion && (
        <div className="assistant-suggestion">
          {suggestion}
          <div className="assistant-suggestion-actions">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                onAccept(suggestion);
                setSuggestion(null);
              }}
            >
              Accept
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setSuggestion(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
