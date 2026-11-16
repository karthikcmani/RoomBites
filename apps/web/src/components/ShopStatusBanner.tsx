import React, { useState } from 'react';
import { Moon, Clock, AlertTriangle, X, PhoneCall } from 'lucide-react';
import { useRealtime } from '../contexts/RealtimeContext.js';

export const ShopStatusBanner: React.FC = () => {
  const { shopSettings } = useRealtime();
  const [isDismissed, setIsDismissed] = useState(false);
  const status = shopSettings?.status || 'AVAILABLE';

  if (status === 'AVAILABLE' || isDismissed) return null;

  const getConfig = () => {
    switch (status) {
      case 'SLEEPING':
        return {
          icon: <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />,
          title: 'Kitchen is resting',
          note: shopSettings?.statusNote || 'Orders re-open tonight at 9:00 PM IST',
          bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300'
        };
      case 'BUSY':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-spin" />,
          title: 'Kitchen is busy',
          note: shopSettings?.statusNote || 'Prep times may take 5-10m longer tonight',
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
        };
      case 'CLOSED':
      default:
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
          title: 'Kitchen is closed',
          note: shopSettings?.statusNote || 'Midnight Mess operates 9:00 PM – 5:00 AM',
          bg: 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
        };
    }
  };

  const config = getConfig();

  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${config.bg} transition-all animate-in fade-in`}>
      <div className="flex items-center gap-2 min-w-0">
        {config.icon}
        <div className="truncate">
          <strong className="font-semibold">{config.title}:</strong>{' '}
          <span className="opacity-90">{config.note}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {shopSettings?.emergencyContact && status === 'SLEEPING' && (
          <a
            href={`tel:${shopSettings.emergencyContact}`}
            className="flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
          >
            <PhoneCall className="w-3 h-3" />
            <span>Call</span>
          </a>
        )}
        <button
          onClick={() => setIsDismissed(true)}
          className="text-text-dim hover:text-text-main p-0.5 rounded transition-colors"
          title="Dismiss notice"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
