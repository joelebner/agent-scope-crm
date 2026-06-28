interface ApprovalCheckIconProps {
  className?: string;
}

export function ApprovalCheckIcon({ className }: ApprovalCheckIconProps) {
  return (
    <span
      className={['queue-detail-approval-check', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#0ACD00" />
        <path
          d="M6 10.5L8.5 13L14 7.5"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
