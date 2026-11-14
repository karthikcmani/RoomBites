import React, { useState } from 'react';
import { Coffee, ShieldCheck, User, LogIn, Wifi, WifiOff, Server } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { useRealtime } from '../contexts/RealtimeContext.js';
import { ServerSettingsModal } from './ServerSettingsModal.js';
import { getServerBaseUrl } from '../config/apiConfig.js';

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

  const getStatusBadge = () => {
    const status = shopSettings?.status || 'AVAILABLE';
    switch (status) {
      case 'AVAILABLE':
        return <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Open</span>;
      case 'BUSY':
        return <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Busy</span>;
      case 'SLEEPING':
        return <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-400"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Sleeping</span>;
      default:
        return <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/30 text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Closed</span>;
    }
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 pb-3"
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), var(--app-safe-top, 0px)) + 0.75rem)'
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <div
            onClick={() => onNavigate('menu')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Coffee className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
                  RoomBites
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  RIT
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Night Mess • Room Delivery</p>
            </div>
          </div>

          {/* Center / Status */}
          <div className="hidden sm:flex items-center gap-2">
            {getStatusBadge()}
            <button
              onClick={() => setIsServerSettingsOpen(true)}
              title={isConnected ? 'Live WebSocket Connected (Click for server settings)' : 'Connecting to Realtime Hub... (Click to configure server)'}
              className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              {isConnected ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-slate-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Server Connection Indicator */}
            <button
              onClick={() => setIsServerSettingsOpen(true)}
              title={isConnected ? 'Server Connected' : 'Server Disconnected (Tap to configure)'}
              className="sm:hidden p-1.5 rounded-lg bg-slate-850 border border-slate-800 text-slate-400 hover:text-white"
            >
              {isConnected ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              )}
            </button>

            {user ? (
            <>
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => onNavigate(currentView === 'admin' ? 'menu' : 'admin')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    currentView === 'admin'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-amber-400 border-slate-700 hover:border-amber-500/50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Seller</span> Admin
                </button>
              )}

              <button
                onClick={() => onNavigate(currentView === 'orders' ? 'menu' : 'orders')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                  currentView === 'orders'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600'
                }`}
              >
                Orders
              </button>

              <button
                onClick={onOpenCredit}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
                title="View Credit Dues"
              >
                {profile?.outstandingBalancePaise && profile.outstandingBalancePaise > 0 ? (
                  <span className="text-amber-400 font-bold">
                    Dues: ₹{(profile.outstandingBalancePaise / 100).toFixed(0)}
                  </span>
                ) : (
                  'Dues: ₹0'
                )}
              </button>

              <button
                onClick={onOpenAuth}
                className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:border-amber-500/50 transition-colors"
                title={user.email}
              >
                <User className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
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
