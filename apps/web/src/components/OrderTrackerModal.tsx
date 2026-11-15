import React, { useState } from 'react';
import { X, CheckCircle2, Clock, ChefHat, Bike, AlertCircle, QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import { Order, OrderStatus } from '../types/index.js';
import { formatINR } from '../utils/currency.js';
import { api } from '../services/api.js';
import { useRealtime } from '../contexts/RealtimeContext.js';

interface OrderTrackerModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: (updated: Order) => void;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  order,
  isOpen,
  onClose,
  onOrderUpdated
}) => {
  const { shopSettings } = useRealtime();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !order) return null;

  const steps: Array<{ status: OrderStatus; label: string; icon: React.ReactNode }> = [
    { status: 'PLACED', label: 'Order Received', icon: <Clock className="w-4 h-4" /> },
    { status: 'ACCEPTED', label: 'Accepted by Seller', icon: <CheckCircle2 className="w-4 h-4" /> },
    { status: 'PREPARING', label: 'Cooking on Stove', icon: <ChefHat className="w-4 h-4" /> },
    { status: 'OUT_FOR_DELIVERY', label: 'Walking to Your Room', icon: <Bike className="w-4 h-4" /> },
    { status: 'DELIVERED', label: 'Delivered Hot', icon: <CheckCircle2 className="w-4 h-4" /> }
  ];

  const getStepIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'PLACED': return 0;
      case 'AWAITING_APPROVAL': return 0;
      case 'ACCEPTED': return 1;
      case 'PAYMENT_PENDING': return 1;
      case 'PAID': return 1;
      case 'PREPARING': return 2;
      case 'OUT_FOR_DELIVERY': return 3;
      case 'DELIVERED': return 4;
      default: return -1;
    }
  };

  const currentIndex = getStepIndex(order.status);
  const isTerminated = order.status === 'REJECTED' || order.status === 'CANCELLED';

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await api.orders.cancel(order.id, 'Cancelled by student');
      onOrderUpdated(res.order);
    } catch (err: any) {
      setErrorMsg(err.message || 'Cannot cancel order.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAlternativeResponse = async (action: 'ACCEPT' | 'REJECT') => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await api.orders.respondAlternative(order.id, action);
      onOrderUpdated(res.order);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to respond to alternative.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate clean UPI payment intent URI
  const upiId = shopSettings?.upiId || 'anikumaricmani-1@okicici';
  const upiName = shopSettings?.upiName || 'Anikumari C Mani';
  const amountRupees = (order.totalPaise / 100).toFixed(2);
  // Clean P2P payment parameters without e-commerce tags that trigger bank merchant limit errors
  const upiPayUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amountRupees}&cu=INR`;

  const handleCopyUpi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">Order #{order.orderNumber}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                isTerminated
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Delivering to {order.deliveryRoom}</p>
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
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Alternative Suggestion Banner */}
          {order.status === 'AWAITING_APPROVAL' && order.alternative && (
            <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-300">Seller Proposed an Alternative</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {order.alternative.adminNote || 'The requested item is out of stock. Would you like this substitute?'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAlternativeResponse('ACCEPT')}
                  disabled={isProcessing}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-amber-500/20"
                >
                  Accept Suggestion
                </button>
                <button
                  onClick={() => handleAlternativeResponse('REJECT')}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Stepper */}
          {!isTerminated && (
            <div className="py-2 space-y-4">
              {steps.map((step, idx) => {
                const isPassed = currentIndex >= idx;
                const isCurrent = currentIndex === idx;

                return (
                  <div key={step.status} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-110'
                          : isPassed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-xs font-bold ${
                          isCurrent ? 'text-amber-400' : isPassed ? 'text-slate-200' : 'text-slate-500'
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-[11px] text-slate-400">In progress right now</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isTerminated && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
              <span className="font-bold">Order was {order.status.toLowerCase()}:</span>{' '}
              {order.cancellationReason || 'No details provided.'}
            </div>
          )}

          {/* UPI Payment Assistance */}
          {order.paymentMethod === 'UPI' && order.paymentStatus === 'PENDING' && !isTerminated && (
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  UPI Payment Required
                </span>
                <span className="font-extrabold text-sm text-emerald-400">
                  {formatINR(order.totalPaise)}
                </span>
              </div>

              {/* Verified Payee Details & 1-Tap Copy */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-[10px] text-slate-400">Payee: <strong className="text-slate-200 font-semibold">{upiName}</strong></span>
                  <span className="font-mono font-bold text-amber-300 text-xs truncate select-all">{upiId}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                    isCopied
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy UPI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Direct UPI App Launcher */}
              <a
                href={upiPayUri}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all"
              >
                <span>Pay ₹{amountRupees} via GPay / PhonePe / Paytm</span>
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
              </a>

              {/* NPCI Limit Bypass Instructions */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-amber-300 flex items-center gap-1">
                  <span>💡 If GPay / PhonePe displays "exceeds limit" on direct click:</span>
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Tap <strong className="text-white">Copy UPI</strong> above $\rightarrow$ Open Google Pay or PhonePe $\rightarrow$ Select <strong className="text-amber-400">"Pay UPI ID"</strong> $\rightarrow$ Paste <code className="text-amber-300 font-mono font-bold">{upiId}</code> and transfer <strong>₹{amountRupees}</strong> directly. P2P transfers are free of merchant link restrictions!
                </p>
              </div>
            </div>
          )}

          {/* Cash Payment Assistance */}
          {order.paymentMethod === 'CASH' && order.paymentStatus === 'PENDING' && !isTerminated && (
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-200">
              <span className="font-bold">Cash on Counter/Delivery:</span> Please keep exact change of{' '}
              <strong className="text-emerald-300">{formatINR(order.totalPaise)}</strong> ready.
            </div>
          )}

          {/* Order Items Snapshot */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ordered Items
            </h4>
            <div className="space-y-1.5">
              {order.items?.map(it => (
                <div key={it.id} className="flex justify-between text-xs">
                  <span className="text-slate-300">
                    {it.quantity}x {it.productName}
                  </span>
                  <span className="font-bold text-slate-200">{formatINR(it.subtotalPaise)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        {(order.status === 'PLACED' || order.status === 'AWAITING_APPROVAL') && (
          <div className="p-4 bg-slate-850 border-t border-slate-800 shrink-0">
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:border-rose-500/40 hover:text-rose-300 text-slate-400 font-bold text-xs border border-slate-700 transition-colors"
            >
              Cancel Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
