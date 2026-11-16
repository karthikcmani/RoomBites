import React, { useState } from 'react';
import { Coffee, ShieldCheck, Sun, Moon, Laptop, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { useRealtime } from '../contexts/RealtimeContext.js';
import { useTheme } from '../contexts/ThemeContext.js';
import { ServerSettingsModal } from './ServerSettingsModal.js';
import { NavTab } from './BottomNav.js';

interface NavbarProps {
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenAuth
}) => {
  const { user } = useAuth();
  const { shopSettings } = useRealtime();
  const { mode, resolvedTheme, toggleTheme } = useTheme();
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);

  const status = shopSettings?.status || 'AVAILABLE';

  const getStatusBadge = () => {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'Open', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' };
      case 'BUSY':
        return { label: 'Busy', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' };
      case 'SLEEPING':
        return { label: 'Resting', dot: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10' };
      case 'CLOSED':
      default:
        return { label: 'Closed', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' };
    }
  };

  const badge = getStatusBadge();

  return (
    <>
      <header
        className="sticky top-0 z-30 bg-surface/90 dark:bg-surface/90 backdrop-blur-md border-b border-border-subtle transition-colors"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 0.35rem)'
        }}
      >
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
          {/* Brand Mark + Name + Compact Status */}
          <div
            onClick={() => onNavigate('menu')}
            className="flex items-center gap-2 cursor-pointer select-none active:scale-[0.98] transition-transform"
          >
            <div className="w-7 h-7 rounded-lg bg-accent text-slate-950 flex items-center justify-center font-bold shadow-sm">
              <Coffee className="w-3.5 h-3.5 stroke-[2.8]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-text-main">
                RoomBites
              </span>
              <span className="text-[10px] font-semibold text-text-dim px-1 py-0.2 rounded bg-surface-muted">
                RIT
              </span>
            </div>

            {/* Micro Shop Status Pill */}
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} ${status === 'AVAILABLE' ? 'animate-pulse' : ''}`} />
              <span>{badge.label}</span>
            </div>
          </div>

          {/* Right Action Icons: Theme, Admin, Settings */}
          <div className="flex items-center gap-1.5">
            {/* Admin Dashboard shortcut */}
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => onNavigate(currentTab === 'admin' ? 'menu' : 'admin')}
                className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-all ${
                  currentTab === 'admin'
                    ? 'bg-accent text-slate-950 shadow-sm'
                    : 'bg-surface-elevated text-text-muted hover:text-text-main'
                }`}
                title="Seller Operations Center"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Modern 3-Way Theme Switcher (Light / Dark / System) */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg bg-surface-elevated hover:bg-surface-muted text-text-muted hover:text-text-main flex items-center justify-center transition-colors active:scale-95"
              title={`Appearance: ${mode} (tap to change)`}
              aria-label="Toggle visual theme"
            >
              {mode === 'system' ? (
                <Laptop className="w-3.5 h-3.5 text-accent" />
              ) : resolvedTheme === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-accent" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              )}
            </button>

            {/* Server Settings (LAN / Dev config) */}
            <button
              onClick={() => setIsServerSettingsOpen(true)}
              className="w-8 h-8 rounded-lg bg-surface-elevated hover:bg-surface-muted text-text-dim hover:text-text-muted flex items-center justify-center transition-colors active:scale-95"
              title="Connection settings"
              aria-label="Server settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <ServerSettingsModal
        isOpen={isServerSettingsOpen}
        onClose={() => setIsServerSettingsOpen(false)}
        onSaved={() => window.location.reload()}
      />
    </>
  );
};
