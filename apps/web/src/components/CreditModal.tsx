import React, { useState, useEffect } from 'react';
import { X, Clock, AlertTriangle, ArrowDownRight, ArrowUpRight, Send, CheckCircle2 } from 'lucide-react';
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 text-center space-y-4">
          <Clock className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="font-bold text-sm text-white">Sign In Required</h3>
          <p className="text-xs text-slate-400">
            Please sign in with your RIT institutional email to view your credit ledger and outstanding dues.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
            >
              Close
            </button>
            <button
              onClick={() => { onClose(); onOpenAuth(); }}
              className="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-base text-white">Student Credit Ledger</h3>
            <p className="text-xs text-slate-400">RoomBites Hostelite Trust System</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {message && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Dues Overview Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-850 to-slate-900 border border-slate-800 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Outstanding Dues</p>
                <h2 className="text-2xl font-extrabold text-amber-400">{formatINR(balancePaise)}</h2>
              </div>
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border ${
                isApproved
                  ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {profile?.creditStatus || 'DISABLED'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <p className="text-[11px] text-slate-400">Unpaid Orders</p>
                <p className={`font-bold ${isBlocked ? 'text-rose-400' : 'text-slate-200'}`}>
                  {unpaidCount} / 2 Maximum
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Settlement Method</p>
                <p className="font-semibold text-slate-200">Cash in Admin Room</p>
              </div>
            </div>
          </div>

          {/* Strict 2-Due Rule Explainer */}
          <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
            isBlocked
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              : 'bg-indigo-950/30 border-indigo-500/20 text-indigo-200'
          }`}>
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Rule 15 — The 2-Due Credit Policy</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              To keep the night mess sustainable for a student seller, a customer with more than TWO outstanding unpaid dues is strictly blocked from placing new orders until past balances are settled in the admin's room.
            </p>
          </div>

          {/* Request Button if not approved */}
          {!isApproved && (
            <button
              onClick={handleRequestCredit}
              disabled={isRequesting || profile?.creditStatus === 'REQUESTED'}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {profile?.creditStatus === 'REQUESTED'
                ? 'Credit Request Pending Admin Review'
                : 'Request Credit Privileges from Admin'}
            </button>
          )}

          {/* Ledger Transactions */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Transaction History
            </h4>

            {isLoading ? (
              <p className="text-xs text-slate-500 text-center py-4">Loading ledger transactions...</p>
            ) : ledger.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No credit transactions recorded.</p>
            ) : (
              <div className="space-y-2">
                {ledger.map(entry => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        entry.entryType === 'DEBIT'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {entry.entryType === 'DEBIT' ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{entry.description}</p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`font-extrabold ${
                        entry.entryType === 'DEBIT' ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {entry.entryType === 'DEBIT' ? '+' : '-'}{formatINR(entry.amountPaise)}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Bal: {formatINR(entry.balanceAfterPaise)}
                      </p>
                    </div>
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
