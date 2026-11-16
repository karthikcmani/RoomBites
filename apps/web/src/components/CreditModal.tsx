import React, { useState, useEffect } from 'react';
import { X, Clock, AlertTriangle, ArrowDownRight, ArrowUpRight, Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { formatINR } from '../utils/currency.js';
import { api } from '../services/api.js';
import { CreditLedgerEntry } from '../types/index.js';

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const CreditModal: React.FC<CreditModalProps> = ({ isOpen, onClose, onOpenAuth }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadLedger();
    }
  }, [isOpen, user]);

  const loadLedger = async () => {
    setIsLoading(true);
    try {
      const res = await api.payments.getMyCreditLedger();
      setLedger(res.ledger);
    } catch (err) {
      console.error('Error loading ledger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestCredit = async () => {
    setIsRequesting(true);
    setMessage(null);
    try {
      await api.payments.requestCredit();
      await refreshProfile();
      setMessage('Credit privilege request submitted to admin for approval.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to submit credit request.');
    } finally {
      setIsRequesting(false);
    }
  };

  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className="bg-surface border border-border-subtle w-full max-w-sm rounded-2xl p-5 text-center space-y-3.5 shadow-xl">
          <Clock className="w-8 h-8 text-accent mx-auto" />
          <h3 className="font-bold text-sm text-text-main">Sign In Required</h3>
          <p className="text-xs text-text-muted">
            Sign in with your RIT institutional email to view your credit ledger and outstanding dues.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-surface-elevated text-text-muted font-bold text-xs"
            >
              Close
            </button>
            <button
              onClick={() => { onClose(); onOpenAuth(); }}
              className="flex-1 py-2 rounded-xl bg-accent text-slate-950 font-bold text-xs"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const unpaidCount = profile?.unpaidOrdersCount || 0;
  const balancePaise = profile?.outstandingBalancePaise || 0;
  const isApproved = profile?.creditStatus === 'APPROVED';
  const isBlocked = unpaidCount > 2;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border-subtle w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-border-subtle shrink-0">
          <div>
            <h3 className="font-bold text-sm text-text-main">Student Credit Ledger</h3>
            <p className="text-[11px] text-text-muted">RoomBites Hostelite Trust System</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-surface-elevated flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 overflow-y-auto space-y-3 flex-1 text-xs">
          {message && (
            <div className="p-2.5 rounded-xl bg-accent-surface border border-accent/20 text-accent-text text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Balance & Status Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-surface-elevated">
              <span className="text-[10px] font-semibold text-text-muted">Outstanding Balance</span>
              <p className="text-base font-extrabold text-text-main mt-0.5">{formatINR(balancePaise)}</p>
            </div>

            <div className="p-3 rounded-xl bg-surface-elevated">
              <span className="text-[10px] font-semibold text-text-muted">Credit Status</span>
              <div className="mt-0.5">
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isApproved
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {profile?.creditStatus || 'DISABLED'}
                </span>
              </div>
            </div>
          </div>

          {/* Strict 2-Due Rule Indicator */}
          <div className="p-3 rounded-xl bg-surface-elevated space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-text-main">Unpaid Orders:</span>
              <span className={isBlocked ? 'text-rose-500 font-bold' : 'text-text-muted'}>
                {unpaidCount} / 2 allowed
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
              <div
                className={`h-full transition-all ${
                  unpaidCount >= 2 ? 'bg-rose-500' : unpaidCount === 1 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min((unpaidCount / 2) * 100, 100)}%` }}
              />
            </div>
            {isBlocked && (
              <p className="text-[10px] text-rose-500 flex items-center gap-1 font-medium mt-1">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Credit ordering temporarily locked until dues are settled.</span>
              </p>
            )}
          </div>

          {/* Request Approval Button if not Approved */}
          {!isApproved && (
            <button
              onClick={handleRequestCredit}
              disabled={isRequesting}
              className="w-full py-2.5 rounded-xl bg-accent text-slate-950 font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isRequesting ? 'Requesting...' : 'Request Credit Privilege'}</span>
            </button>
          )}

          {/* Ledger History Table */}
          <div className="space-y-1.5 pt-2">
            <h4 className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Recent Ledger Activity</h4>
            {isLoading ? (
              <div className="space-y-1.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 rounded-lg bg-surface-elevated animate-pulse" />
                ))}
              </div>
            ) : ledger.length === 0 ? (
              <p className="text-[11px] text-text-dim text-center py-4">No ledger transactions yet.</p>
            ) : (
              <div className="space-y-1">
                {ledger.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated text-xs">
                    <div>
                      <p className="font-semibold text-text-main text-[11px]">{entry.description || entry.entryType}</p>
                      <span className="text-[10px] text-text-dim">{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className={`font-bold ${entry.entryType === 'DEBIT' ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {entry.entryType === 'DEBIT' ? '+' : '-'}{formatINR(entry.amountPaise)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
