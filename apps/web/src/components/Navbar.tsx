import React, { useState } from 'react';
import { Coffee, ShieldCheck, User, LogIn, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { useRealtime } from '../contexts/RealtimeContext.js';
import { ServerSettingsModal } from './ServerSettingsModal.js';

interface NavbarProps {
  currentView: 'menu' | 'orders' | 'admin';
  onNavigate: (view: 'menu' | 'orders' | 'admin') => void;
  onOpenAuth: () => void;
  onOpenCredit: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenCredit
}) => {
  const { user, profile } = useAuth();
  const { isConnected, shopSettings } = useRealtime();
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);

  const status = shopSettings?.status || 'AVAILABLE';

  return (
    <>
      <header
        className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-4 pb-2.5 transition-all"
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), var(--app-safe-top, 0px)) + 0.65rem)'
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Minimal Brand with Live Status Dot */}
          <div
            onClick={() => onNavigate('menu')}
            className="flex items-center gap-2 cursor-pointer select-none active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
              <Coffee className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">
                RoomBites
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'AVAILABLE'
                    ? 'bg-emerald-400 animate-pulse'
                    : status === 'BUSY'
                    ? 'bg-amber-400'
                    : 'bg-indigo-400'
                }`}
                title={`Mess is ${status.toLowerCase()}`}
              />
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {user.role === 'ADMIN' && (
                  <button
                    onClick={() => onNavigate(currentView === 'admin' ? 'menu' : 'admin')}
                    className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                      currentView === 'admin'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-900 text-amber-400 border-amber-500/30 hover:border-amber-500/60'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin
                  </button>
                )}

                <button
                  onClick={() => onNavigate(currentView === 'orders' ? 'menu' : 'orders')}
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                    currentView === 'orders'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  Orders
                </button>

                {profile?.outstandingBalancePaise && profile.outstandingBalancePaise > 0 ? (
                  <button
                    onClick={onOpenCredit}
                    className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    Dues: ₹{(profile.outstandingBalancePaise / 100).toFixed(0)}
                  </button>
                ) : null}

                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:border-amber-500/50 transition-colors"
                >
                  <User className="w-3 h-3 text-amber-400" />
                  <span className="max-w-[80px] truncate">
                    {profile?.roomNumber || 'Account'}
                  </span>
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all shadow-md shadow-amber-500/20"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}

            {/* Subtle Settings for Mobile Testers */}
            <button
              onClick={() => setIsServerSettingsOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-colors"
              title={isConnected ? 'Server Connected' : 'Server Settings'}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <ServerSettingsModal
        isOpen={isServerSettingsOpen}
        onClose={() => setIsServerSettingsOpen(false)}
      />
    </>
  );
};
