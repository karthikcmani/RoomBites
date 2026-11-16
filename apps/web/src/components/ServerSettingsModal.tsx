import React, { useState } from 'react';
import { X, Server, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { getServerBaseUrl, setServerBaseUrl, DEFAULT_ANDROID_DEV_SERVER } from '../config/apiConfig.js';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const currentUrl = getServerBaseUrl();
  const [serverUrl, setServerUrl] = useState(currentUrl || DEFAULT_ANDROID_DEV_SERVER);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult({ status: 'idle', message: '' });
    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');

    try {
      const target = cleanUrl ? `${cleanUrl}/health` : '/health';
      const response = await fetch(target, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setTestResult({
        status: 'success',
        message: `Connected successfully! (${data.service || 'RoomBites Backend'} v${data.version || '1.0.0'})`
      });
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: `Failed to connect: ${err.message || 'Network unreachable'}. Ensure PC backend is active.`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
    setServerBaseUrl(cleanUrl);
    if (onSaved) {
      onSaved();
    }
    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border-subtle w-full max-w-sm rounded-2xl overflow-hidden shadow-xl transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-accent" />
            <h3 className="font-bold text-sm text-text-main">Backend API Server</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-surface-elevated flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-text-muted">Host Server URL</label>
            <input
              type="text"
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              placeholder="e.g. http://172.16.9.243:4000"
              className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-surface border border-border-subtle text-text-main"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex-1 py-2 rounded-xl bg-surface-elevated hover:bg-surface-muted text-text-main font-bold text-xs flex items-center justify-center gap-1 border border-border-subtle transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2 rounded-xl bg-accent text-slate-950 font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all"
            >
              Save & Apply
            </button>
          </div>

          {testResult.status === 'success' && (
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{testResult.message}</span>
            </div>
          )}

          {testResult.status === 'error' && (
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
