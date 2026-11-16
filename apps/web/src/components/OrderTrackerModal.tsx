import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, ChefHat, Bike, AlertCircle, QrCode, Copy, Check, ExternalLink, Phone, ChevronDown, ChevronUp, ShieldAlert, Send } from 'lucide-react';
import QRCode from 'qrcode';
import { Order, OrderStatus } from '../types/index.js';
import { formatINR } from '../utils/currency.js';
import { buildUpiUri, buildUpiQrString, formatPaiseToRupees, isValidVpa } from '../utils/upi.js';
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
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState(true);

  // UTR submission state
  const [utrInput, setUtrInput] = useState('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);
  const [utrSuccessMsg, setUtrSuccessMsg] = useState<string | null>(null);

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

  // Verified payee details and precise amount configuration
  const rawUpiId = shopSettings?.upiId || 'anikumaricmani-1@okicici';
  const upiId = isValidVpa(rawUpiId) ? rawUpiId : 'anikumaricmani-1@okicici';
  const upiName = shopSettings?.upiName || 'Karthik C Mani';
  const sellerPhone = (shopSettings?.emergencyContact || '9847837607').replace(/[^0-9]/g, '').slice(-10);
  const amountRupees = formatPaiseToRupees(order.totalPaise);

  // Authoritative, standards-compliant NPCI UPI Payment URIs
  const genericUpiUri = buildUpiUri({
    vpa: upiId,
    payeeName: upiName,
    amountPaise: order.totalPaise,
    orderNumber: order.orderNumber
  });

  const gpayUri = buildUpiUri({
    vpa: upiId,
    payeeName: upiName,
    amountPaise: order.totalPaise,
    orderNumber: order.orderNumber,
    app: 'gpay'
  });

  const phonepeUri = buildUpiUri({
    vpa: upiId,
    payeeName: upiName,
    amountPaise: order.totalPaise,
    orderNumber: order.orderNumber,
    app: 'phonepe'
  });

  const paytmUri = buildUpiUri({
    vpa: upiId,
    payeeName: upiName,
    amountPaise: order.totalPaise,
    orderNumber: order.orderNumber,
    app: 'paytm'
  });

  const qrUri = buildUpiQrString({
    vpa: upiId,
    payeeName: upiName,
    amountPaise: order.totalPaise,
    orderNumber: order.orderNumber
  });

  // Dynamic offline QR code generation with exact order total and recipient
  useEffect(() => {
    QRCode.toDataURL(qrUri, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    }).then(setQrCodeDataUrl).catch(() => {});
  }, [qrUri]);

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedTarget(label);
      setTimeout(() => setCopiedTarget(null), 2500);
    }
  };

  const handleOpenUpi = (targetUri: string = genericUpiUri) => {
    // Copy UPI ID to clipboard as a helpful fallback
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiId).catch(() => {});
    }
    window.location.href = targetUri;
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput.trim()) return;
    setIsSubmittingUtr(true);
    setErrorMsg(null);
    setUtrSuccessMsg(null);
    try {
      const res = await api.payments.submitUtr(order.id, utrInput.trim());
      setUtrSuccessMsg('UTR submitted! The seller will verify receipt before delivery.');
      setUtrInput('');
      onOrderUpdated({ ...order, transactionRef: res.order.transactionRef });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit UTR.');
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border-subtle w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-border-subtle shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-text-main">Order #{order.orderNumber}</h3>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                isTerminated
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}>
                {order.status}
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">Delivering to {order.deliveryRoom}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-surface-elevated flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-3.5 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          {utrSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{utrSuccessMsg}</span>
            </div>
          )}

          {/* Alternative Suggestion Banner */}
          {order.status === 'AWAITING_APPROVAL' && order.alternative && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-text-main">Seller Proposed an Alternative</h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {order.alternative.adminNote || 'The requested item is out of stock. Would you like this substitute?'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAlternativeResponse('ACCEPT')}
                  disabled={isProcessing}
                  className="flex-1 py-1.5 rounded-lg bg-accent text-slate-950 font-bold text-xs transition-opacity hover:opacity-95"
                >
                  Accept Suggestion
                </button>
                <button
                  onClick={() => handleAlternativeResponse('REJECT')}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-lg bg-surface-elevated text-text-muted font-bold text-xs border border-border-subtle"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Stepper */}
          {!isTerminated && (
            <div className="py-1 space-y-3">
              {steps.map((step, idx) => {
                const isPassed = currentIndex >= idx;
                const isCurrent = currentIndex === idx;

                return (
                  <div key={step.status} className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isCurrent
                          ? 'bg-accent text-slate-950 shadow-sm font-bold scale-105'
                          : isPassed
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-surface-elevated text-text-dim'
                      }`}
                    >
                      {step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold ${
                          isCurrent ? 'text-accent font-bold' : isPassed ? 'text-text-main' : 'text-text-dim'
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-[10px] text-text-muted">In progress right now</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isTerminated && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              <span className="font-bold">Order was {order.status.toLowerCase()}:</span>{' '}
              {order.cancellationReason || 'No details provided.'}
            </div>
          )}

          {/* UPI Payment Assistance & Flow */}
          {order.paymentMethod === 'UPI' && !isTerminated && (
            <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-text-main flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-accent" />
                  <span>UPI Payment</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    order.paymentStatus === 'VERIFIED'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}>
                    {order.paymentStatus === 'VERIFIED' ? 'Payment Verified' : 'Pending Verification'}
                  </span>
                  <span className="font-extrabold text-sm text-text-main">
                    {formatINR(order.totalPaise)}
                  </span>
                </div>
              </div>

              {order.paymentStatus === 'VERIFIED' ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>The seller has verified and recorded your UPI payment. Your order is being processed!</span>
                </div>
              ) : (
                <>
                  {/* Primary 1-Tap Action: Launches UPI App with Authoritative Exact Amount */}
                  <button
                    type="button"
                    onClick={() => handleOpenUpi(genericUpiUri)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-slate-950 font-extrabold text-xs shadow-md shadow-accent/20 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>Pay ₹{amountRupees} via UPI App</span>
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  {/* Direct App Launchers */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenUpi(gpayUri)}
                      className="py-1.5 px-2 rounded-lg bg-surface hover:bg-surface-muted border border-border-subtle text-xs font-semibold text-text-main flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <span className="text-amber-500 font-bold">G</span>Pay
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenUpi(phonepeUri)}
                      className="py-1.5 px-2 rounded-lg bg-surface hover:bg-surface-muted border border-border-subtle text-xs font-semibold text-text-main flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <span className="text-purple-500 font-bold">Phone</span>Pe
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenUpi(paytmUri)}
                      className="py-1.5 px-2 rounded-lg bg-surface hover:bg-surface-muted border border-border-subtle text-xs font-semibold text-text-main flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <span className="text-sky-500 font-bold">Pay</span>tm
                    </button>
                  </div>

                  {/* Dynamic QR Code Card (Guaranteed solution if UPI intent is blocked by risk policy) */}
                  <div className="rounded-xl bg-surface border border-border-subtle p-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowQrCode(prev => !prev)}
                      className="w-full flex items-center justify-between text-xs font-semibold text-text-main transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-accent" />
                        <span>Scan Dynamic QR (Direct ₹{amountRupees})</span>
                      </span>
                      {showQrCode ? <ChevronUp className="w-4 h-4 text-text-dim" /> : <ChevronDown className="w-4 h-4 text-text-dim" />}
                    </button>

                    {showQrCode && (
                      <div className="flex flex-col items-center pt-1 space-y-1.5">
                        {qrCodeDataUrl ? (
                          <div className="p-2 bg-white rounded-xl shadow-sm border border-border-subtle">
                            <img
                              src={qrCodeDataUrl}
                              alt={`Pay ₹${amountRupees} QR`}
                              className="w-40 h-40 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-40 h-40 flex items-center justify-center bg-surface-muted rounded-xl text-text-dim text-xs">
                            Loading QR...
                          </div>
                        )}
                        <p className="text-[10px] text-text-muted text-center max-w-[260px]">
                          Scan with Google Pay, PhonePe, Paytm, or take a screenshot and select <strong className="text-text-main">"Scan from Gallery"</strong>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Payee Details & Copy Actions */}
                  <div className="p-2.5 rounded-xl bg-surface border border-border-subtle space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[10px] text-text-muted">Payee: <strong className="text-text-main font-semibold">{upiName}</strong></span>
                        <span className="font-mono font-bold text-accent text-xs truncate select-all">{upiId}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(amountRupees, 'amount')}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-surface-elevated hover:bg-surface-muted text-text-main border border-border-subtle transition-all"
                        >
                          {copiedTarget === 'amount' ? 'Copied ₹!' : `Copy ₹${amountRupees}`}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(upiId, 'upi')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            copiedTarget === 'upi'
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-surface-elevated hover:bg-surface-muted text-text-main border border-border-subtle'
                          }`}
                        >
                          {copiedTarget === 'upi' ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy UPI</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Pay via Mobile Number Option (Direct Paytm/GPay Contact Solution) */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-border-subtle">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-500" />
                          <span>Pay via Mobile Number (UPI contact):</span>
                        </span>
                        <span className="font-mono font-bold text-text-main text-xs">{sellerPhone}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(sellerPhone, 'phone')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                          copiedTarget === 'phone'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-surface-elevated hover:bg-surface-muted text-text-main border border-border-subtle'
                        }`}
                      >
                        {copiedTarget === 'phone' ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* UTR / Transaction Reference Submission */}
                  <div className="p-2.5 rounded-xl bg-surface border border-border-subtle space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-text-muted">Paid already? Submit 12-digit UPI UTR</span>
                      {order.transactionRef && (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          Submitted: {order.transactionRef}
                        </span>
                      )}
                    </div>
                    {!order.transactionRef ? (
                      <form onSubmit={handleSubmitUtr} className="flex gap-1.5">
                        <input
                          type="text"
                          value={utrInput}
                          onChange={e => setUtrInput(e.target.value)}
                          placeholder="e.g. 432190821001"
                          maxLength={35}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-elevated border border-border-subtle text-xs text-text-main font-mono placeholder:text-text-dim focus:outline-none focus:border-accent"
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingUtr || !utrInput.trim()}
                          className="px-3 py-1.5 rounded-lg bg-accent text-slate-950 font-bold text-xs flex items-center gap-1 disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          <span>Submit</span>
                        </button>
                      </form>
                    ) : (
                      <p className="text-[10px] text-text-muted">
                        UTR submitted. Waiting for seller to verify on their device.
                      </p>
                    )}
                  </div>

                  {/* Zero-trust payment verification notice */}
                  <div className="p-2 rounded-lg bg-surface-muted text-[10px] text-text-muted flex items-start gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                    <p>
                      Launching your UPI app does not automatically mark your order as paid. The seller independently verifies receipt before handing over your food.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Cash Payment Assistance */}
          {order.paymentMethod === 'CASH' && order.paymentStatus === 'PENDING' && !isTerminated && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
              <span className="font-bold">Cash on Counter/Delivery:</span> Please keep exact change of{' '}
              <strong className="font-extrabold">{formatINR(order.totalPaise)}</strong> ready.
            </div>
          )}

          {/* Order Items Snapshot */}
          <div className="space-y-1.5 border-t border-border-subtle pt-3">
            <h4 className="text-[10px] font-bold text-text-dim uppercase tracking-wider">
              Ordered Items
            </h4>
            <div className="space-y-1">
              {order.items?.map(it => (
                <div key={it.id} className="flex justify-between text-xs">
                  <span className="text-text-muted">
                    {it.quantity}x {it.productName}
                  </span>
                  <span className="font-bold text-text-main">{formatINR(it.subtotalPaise)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        {(order.status === 'PLACED' || order.status === 'AWAITING_APPROVAL') && (
          <div className="p-3 bg-surface border-t border-border-subtle shrink-0">
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="w-full py-2 rounded-xl bg-surface-elevated hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 text-text-muted font-bold text-xs border border-border-subtle transition-colors"
            >
              Cancel Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
