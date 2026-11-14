import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../contexts/CartContext.js';
import { formatINR } from '../utils/currency.js';

export const FloatingCartBar: React.FC = () => {
  const { itemCount, subtotalPaise, setIsCartOpen } = useCart();

  if (itemCount === 0) return null;

  return (
    <aside
      aria-label="Cart summary"
      className="fixed left-4 right-4 z-40 max-w-lg mx-auto animate-in slide-in-from-bottom duration-300"
      style={{
        bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 0.75rem) + 0.5rem)'
      }}
    >
      <button
        onClick={() => setIsCartOpen(true)}
        className="w-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-extrabold p-3.5 rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-between hover:from-amber-400 hover:to-amber-300 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold text-xs">
            {itemCount}
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-900/80 leading-none">Your Cart</p>
            <p className="text-base font-extrabold leading-tight">{formatINR(subtotalPaise)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-slate-950/10 px-3 py-1.5 rounded-xl">
          <span>Checkout</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </div>
      </button>
    </aside>
  );
};
