import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export interface FloatingAlertProps {
  message: string | null;
  type?: 'error' | 'warning' | 'success';
  onDismiss: () => void;
  duration?: number; // Duration in ms (default 4500ms)
  isOverrideable?: boolean;
}

export const FloatingAlert: React.FC<FloatingAlertProps> = ({
  message,
  type = 'error',
  onDismiss,
  duration = 4500,
  isOverrideable = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      setIsFading(false);

      const fadeTimer = setTimeout(() => {
        setIsFading(true);
        const removeTimer = setTimeout(() => {
          setVisible(false);
          onDismiss();
        }, 350); // Wait for CSS fade out transition
        return () => clearTimeout(removeTimer);
      }, duration);

      return () => clearTimeout(fadeTimer);
    } else {
      setVisible(false);
      setIsFading(false);
    }
  }, [message, duration, onDismiss]);

  if (!visible || !message || typeof document === 'undefined') {
    return null;
  }

  const handleManualDismiss = () => {
    setIsFading(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 200);
  };

  const getAlertClass = () => {
    if (type === 'success') return 'floating-top-alert-success';
    if (type === 'warning') return 'floating-top-alert-warning';
    return 'floating-top-alert-error';
  };

  const renderIcon = () => {
    if (type === 'success') {
      return <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />;
    }
    if (type === 'warning') {
      return <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />;
    }
    return <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400" />;
  };

  return createPortal(
    <aside
      className={`floating-top-alert ${getAlertClass()} ${
        isFading ? 'alert-fade-out' : ''
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-3">
        {renderIcon()}
        <span className="font-bold text-xs sm:text-sm leading-snug">
          {message}
          {type === 'warning' && isOverrideable && (
            <span className="underline ml-1.5 opacity-90">(Click again to proceed)</span>
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={handleManualDismiss}
        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors ml-2 flex-shrink-0 cursor-pointer"
        aria-label="Dismiss alert"
      >
        <X className="w-4 h-4" />
      </button>
    </aside>,
    document.body
  );
};
