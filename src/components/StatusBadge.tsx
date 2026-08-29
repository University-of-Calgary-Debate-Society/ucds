import React from 'react';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'ready' | 'active' | 'warning' | 'pending';
  text: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text, className }) => {
  const configs = {
    ready: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2,
    },
    active: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
      icon: CheckCircle2,
    },
    warning: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
      icon: AlertCircle,
    },
    pending: {
      bg: 'bg-slate-500/10 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30',
      icon: Clock,
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors',
        config.bg,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {text}
    </span>
  );
};
