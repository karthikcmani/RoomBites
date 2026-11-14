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
        message: `Failed to connect: ${err.message || 'Network unreachable'}. Verify IP and ensure backend server is running.`
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
    // Refresh to reinitialize WebSocket and data fetches with new endpoint
    window.location.reload();
  };

  const handleReset = () => {
    setServerBaseUrl(null);
    setServerUrl(DEFAULT_ANDROID_DEV_SERVER);
    setTestResult({ status: 'idle', message: '' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">Backend Server Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Configure the reachable network address of your development computer running the RoomBites backend.
          </p>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300">Server Base URL</label>
            <input
              type="text"
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              placeholder="e.g. http://172.16.9.243:4000"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Presets</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setServerUrl(DEFAULT_ANDROID_DEV_SERVER)}
                className="text-[10px] p-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-left border border-slate-800 truncate"
                title="Current Wi-Fi LAN IP"
              >
                📡 Wi-Fi: 172.16.9.243:4000
              </button>
              <button
                type="button"
                onClick={() => setServerUrl('http://localhost:4000')}
                className="text-[10px] p-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-left border border-slate-800 truncate"
                title="Use with 'adb reverse tcp:4000 tcp:4000'"
              >
                🔌 ADB: localhost:4000
              </button>
              <button
                type="button"
                onClick={() => setServerUrl('http://10.0.2.2:4000')}
                className="text-[10px] p-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-left border border-slate-800 truncate"
                title="Android Emulator Loopback"
              >
                📱 Emulator: 10.0.2.2:4000
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-[10px] p-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 text-left border border-slate-800 truncate"
              >
                🔄 Reset Default
              </button>
            </div>
          </div>

          {/* Test Status Banner */}
          {testResult.status !== 'idle' && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                testResult.status === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <span className="leading-snug">{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
