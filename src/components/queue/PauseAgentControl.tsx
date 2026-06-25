import { useState } from 'react';
import { useAppStore } from '../../store';

interface PauseAgentControlProps {
  compact?: boolean;
}

export function PauseAgentControl({ compact = false }: PauseAgentControlProps) {
  const [open, setOpen] = useState(false);
  const agent = useAppStore((s) => s.agent);
  const agentPauseUntil = useAppStore((s) => s.agentPauseUntil);
  const pauseAgent = useAppStore((s) => s.pauseAgent);
  const resumeAgent = useAppStore((s) => s.resumeAgent);

  const isPaused = agent.status === 'paused' && agentPauseUntil;

  const pauseForHours = (hours: number) => {
    const until = new Date();
    until.setHours(until.getHours() + hours);
    pauseAgent(until.toISOString());
    setOpen(false);
  };

  const pauseRestOfDay = () => {
    const until = new Date('2026-06-23T23:59:59.999Z');
    pauseAgent(until.toISOString());
    setOpen(false);
  };

  if (isPaused) {
    if (compact) {
      return (
        <button
          type="button"
          className="topbar-action-btn mono"
          onClick={resumeAgent}
        >
          Resume agent
        </button>
      );
    }

    return (
      <div className="agent-paused-banner">
        <span>
          Agent paused until{' '}
          {new Date(agentPauseUntil!).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
        <button type="button" className="btn btn-sm" onClick={resumeAgent}>
          Resume now
        </button>
      </div>
    );
  }

  return (
    <div className="pause-menu">
      <button
        type="button"
        className="select-control select-control--trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="select-field mono">Pause agent</span>
        <span className="select-chevron" aria-hidden="true">
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
      </button>
      {open && (
        <div className="pause-dropdown" role="menu">
          <button type="button" role="menuitem" onClick={() => pauseForHours(4)}>
            4 hours
          </button>
          <button type="button" role="menuitem" onClick={pauseRestOfDay}>
            Rest of day
          </button>
          <button type="button" role="menuitem" onClick={() => pauseForHours(24)}>
            24 hours (custom)
          </button>
        </div>
      )}
    </div>
  );
}
