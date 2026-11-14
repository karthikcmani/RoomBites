import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, MapPin, CreditCard, Banknote, Clock, AlertCircle } from 'lucide-react';
import { useCart } from '../contexts/CartContext.js';
import { useAuth } from '../contexts/AuthContext.js';
import { formatINR } from '../utils/currency.js';
import { api } from '../services/api.js';
import { PaymentMethod, Order } from '../types/index.js';

interface CartSheetProps {
  onOrderPlaced: (order: Order) => void;
  onOpenAuth: () => void;
  onOpenCredit: () => void;
}

export const CartSheet: React.FC<CartSheetProps> = ({
  onOrderPlaced,
  onOpenAuth,
  onOpenCredit
}) => {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, clearCart, subtotalPaise } = useCart();
  const { user, profile, refreshProfile } = useAuth();

  const [roomNumber, setRoomNumber] = useState(profile?.roomNumber || '');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isCartOpen) return null;

  const handlePlaceOrder = async () => {
    setErrorMsg(null);

    if (!user) {
      onOpenAuth();
      return;
    }

    const targetRoom = roomNumber.trim() || profile?.roomNumber;
    if (!targetRoom) {
      setErrorMsg('Please enter your hostel block and room number.');
      return;
    }

    if (paymentMethod === 'CREDIT') {
      if (profile?.creditStatus !== 'APPROVED') {
        setErrorMsg('Your account is not approved for purchasing on credit. Please request credit approval first.');
        return;
      }
      if ((profile?.unpaidOrdersCount || 0) > 2) {
        setErrorMsg(`You have ${profile?.unpaidOrdersCount} unpaid orders. Maximum 2 unpaid dues permitted. Please settle past dues.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payloadItems = items.map(it => ({
        productId: it.product.id,
        quantity: it.quantity,
        selectedOptions: it.selectedOptions
      }));

      const res = await api.orders.place({
        deliveryRoom: targetRoom,
        specialInstructions: instructions.trim() || undefined,
        paymentMethod,
        isScheduled,
        scheduledFor: isScheduled && scheduledFor ? scheduledFor : undefined,
        items: payloadItems
      });

      clearCart();
      setIsCartOpen(false);
      await refreshProfile();
      onOrderPlaced(res.order);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCreditBlocked = (profile?.unpaidOrdersCount || 0) > 2;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-white">Your Order Details</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              {items.length} items
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Items List */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Items
            </label>
            {items.map((it, idx) => (
              <div
                key={`${it.product.id}-${idx}`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-850 border border-slate-800"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-bold text-xs text-slate-100 truncate">{it.product.name}</h4>
                  {it.selectedOptions && Object.keys(it.selectedOptions).length > 0 && (
                    <p className="text-[10px] text-amber-400/80">
                      {Object.entries(it.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                    </p>
                  )}
                  <p className="text-xs font-extrabold text-amber-400 mt-0.5">
                    {formatINR(it.subtotalPaise)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(it.product.id, it.quantity - 1, it.selectedOptions)}
                      className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold px-2 text-white">{it.quantity}</span>
                    <button
                      onClick={() => updateQuantity(it.product.id, it.quantity + 1, it.selectedOptions)}
                      className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(it.product.id, it.selectedOptions)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Room */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Delivery Room Number
            </label>
            <input
              type="text"
              placeholder="e.g. Men's Hostel B-204"
              value={roomNumber}
              onChange={e => setRoomNumber(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Cooking Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Special Preparation or Delivery Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Extra spicy, don't knock loudly, call upon arrival"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              Payment Method
            </label>

            <div className="grid grid-cols-3 gap-2">
              {/* UPI */}
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  paymentMethod === 'UPI'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold">UPI</span>
                <span className="text-[9px] text-slate-400">QR / GPay</span>
              </button>

              {/* CASH */}
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">Cash</span>
                <span className="text-[9px] text-slate-400">Pay in Room</span>
              </button>

              {/* CREDIT */}
              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  paymentMethod === 'CREDIT'
                    ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold">Credit</span>
                <span className="text-[9px] text-slate-400">
                  {profile?.creditStatus === 'APPROVED' ? 'Approved' : 'Request'}
                </span>
              </button>
            </div>

            {/* Credit Warning / Status */}
            {paymentMethod === 'CREDIT' && (
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Credit Account Status:</span>
                  <span className="font-extrabold uppercase text-[11px] text-indigo-300">
                    {profile?.creditStatus || 'DISABLED'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Unpaid Dues Count:</span>
                  <span className={`font-bold ${isCreditBlocked ? 'text-rose-400' : 'text-slate-300'}`}>
                    {profile?.unpaidOrdersCount || 0} / 2 allowed
                  </span>
                </div>
                {isCreditBlocked && (
                  <p className="text-[11px] text-rose-400 font-semibold pt-1">
                    Rule 15: You have more than 2 unpaid orders. Credit checkout is blocked until previous balance is paid.
                  </p>
                )}
                {profile?.creditStatus !== 'APPROVED' && (
                  <button
                    onClick={onOpenCredit}
                    className="mt-1 text-[11px] font-bold text-amber-400 underline hover:text-amber-300 block"
                  >
                    Click here to request credit privileges →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="p-3 rounded-xl bg-slate-850/80 border border-slate-800 space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Items Total</span>
              <span className="font-bold text-slate-200">{formatINR(subtotalPaise)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Hostel Room Delivery</span>
              <span className="font-bold text-emerald-400 uppercase text-[11px]">FREE (₹0)</span>
            </div>
            <div className="border-t border-slate-700/60 pt-1.5 flex justify-between font-extrabold text-sm text-white">
              <span>Total to Pay</span>
              <span className="text-amber-400">{formatINR(subtotalPaise)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-850 border-t border-slate-800 shrink-0">
          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting || (paymentMethod === 'CREDIT' && isCreditBlocked)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Confirming with Kitchen...</span>
            ) : (
              <span>Place Order • {formatINR(subtotalPaise)}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
