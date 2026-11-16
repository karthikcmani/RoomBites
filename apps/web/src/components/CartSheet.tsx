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

  React.useEffect(() => {
    if (profile?.roomNumber && !roomNumber) {
      setRoomNumber(profile.roomNumber);
    }
  }, [profile]);

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border-subtle w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-text-main">Your Order</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-muted text-text-muted">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="w-7 h-7 rounded-lg bg-surface-elevated flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-3.5 overflow-y-auto space-y-3.5 flex-1 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Cart Items List */}
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div
                key={`${it.product.id}-${idx}`}
                className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated"
              >
                <div className="min-w-0 pr-2">
                  <h4 className="font-semibold text-text-main text-xs truncate">{it.product.name}</h4>
                  {it.selectedOptions && Object.keys(it.selectedOptions).length > 0 && (
                    <p className="text-[10px] text-text-muted">
                      {Object.entries(it.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                    </p>
                  )}
                  <p className="text-xs font-bold text-text-main mt-0.5">
                    {formatINR(it.product.pricePaise * it.quantity)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center rounded-lg bg-surface border border-border-subtle p-0.5">
                    <button
                      onClick={() => updateQuantity(it.product.id, it.quantity - 1, it.selectedOptions)}
                      className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-main"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-text-main">{it.quantity}</span>
                    <button
                      onClick={() => updateQuantity(it.product.id, it.quantity + 1, it.selectedOptions)}
                      className="w-6 h-6 flex items-center justify-center rounded text-accent"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(it.product.id, it.selectedOptions)}
                    className="p-1 text-text-dim hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Room */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-muted flex items-center gap-1">
              <MapPin className="w-3 h-3 text-accent" />
              <span>Delivery Room / Hostel</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Room 228, MH2"
              value={roomNumber}
              onChange={e => setRoomNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-muted">
              Special Instructions (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Extra spicy, no sugar"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main"
            />
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-text-muted">Payment Method</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'UPI'
                    ? 'border-accent bg-accent-surface text-accent font-bold'
                    : 'border-border-subtle bg-surface hover:bg-surface-elevated text-text-muted'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-[10px]">UPI</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-accent bg-accent-surface text-accent font-bold'
                    : 'border-border-subtle bg-surface hover:bg-surface-elevated text-text-muted'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span className="text-[10px]">Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT')}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'CREDIT'
                    ? 'border-accent bg-accent-surface text-accent font-bold'
                    : 'border-border-subtle bg-surface hover:bg-surface-elevated text-text-muted'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="text-[10px]">Credit</span>
              </button>
            </div>
            {paymentMethod === 'CREDIT' && isCreditBlocked && (
              <p className="text-[10px] text-rose-500 mt-1">
                2 unpaid dues limit exceeded. Please settle past dues first.
              </p>
            )}
          </div>
        </div>

        {/* Footer Checkout CTA */}
        <div className="p-3.5 border-t border-border-subtle bg-surface shrink-0 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted font-medium">Total Amount:</span>
            <span className="text-base font-extrabold text-text-main">{formatINR(subtotalPaise)}</span>
          </div>

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isSubmitting || (paymentMethod === 'CREDIT' && isCreditBlocked)}
            className="w-full py-3 rounded-xl bg-accent text-slate-950 font-extrabold text-xs shadow-md shadow-accent/20 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Placing Order...' : user ? `Confirm Order (${formatINR(subtotalPaise)})` : 'Sign in to Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
};
