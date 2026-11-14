import React from 'react';
import { Moon, Clock, PhoneCall, Sparkles, AlertTriangle } from 'lucide-react';
import { useRealtime } from '../contexts/RealtimeContext.js';

export const ShopStatusBanner: React.FC = () => {
  const { shopSettings, announcements } = useRealtime();
  const status = shopSettings?.status || 'AVAILABLE';

  return (
    <div className="space-y-2 mb-4">
      {/* Operating Status Alert if not Available */}
      {status === 'SLEEPING' && (
        <div className="bg-indigo-950/70 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-indigo-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/80 flex items-center justify-center text-indigo-400 shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Kitchen is Sleeping</h4>
              <p className="text-xs text-indigo-300">
                {shopSettings?.statusNote || 'The seller is resting. New orders open tonight at 9:00 PM.'}
              </p>
            </div>
          </div>
          {shopSettings?.emergencyContact && (
            <a
              href={`tel:${shopSettings.emergencyContact}`}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 transition-colors shadow-sm"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Emergency Call
            </a>
          )}
        </div>
      )}

      {status === 'BUSY' && (
        <div className="bg-amber-950/60 border border-amber-500/30 rounded-2xl p-3.5 flex items-center gap-3 text-amber-200">
          <div className="w-9 h-9 rounded-xl bg-amber-900/60 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-amber-100">Kitchen is Busy with Existing Orders</h4>
            <p className="text-[11px] sm:text-xs text-amber-300/90">
              {shopSettings?.statusNote || 'Preparation times may take slightly longer than usual tonight.'}
            </p>
          </div>
        </div>
      )}

      {status === 'CLOSED' && (
        <div className="bg-rose-950/60 border border-rose-500/30 rounded-2xl p-3.5 flex items-center gap-3 text-rose-200">
          <div className="w-9 h-9 rounded-xl bg-rose-900/60 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-rose-100">Night Mess Closed</h4>
            <p className="text-[11px] sm:text-xs text-rose-300/90">
              {shopSettings?.statusNote || 'Hours: 9:00 PM to 5:00 AM IST daily.'}
            </p>
          </div>
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-3 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-bold text-amber-300 mr-2">{announcements[0].title}:</span>
            <span className="text-slate-300">{announcements[0].message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
