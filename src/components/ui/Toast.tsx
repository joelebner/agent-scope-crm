import { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  onClear: () => void;
}

export function Toast({ message, onClear }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClear, 3000);
    return () => clearTimeout(timer);
  }, [message, onClear]);

  if (!message) return null;

  return <div className="toast">{message}</div>;
}
