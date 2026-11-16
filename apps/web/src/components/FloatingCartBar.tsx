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
      className="fixed left-3 right-3 z-35 max-w-md mx-auto animate-in slide-in-from-bottom-2 duration-200"
      style={{
        bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 0.35rem) + 3.9rem)'
      }}
    >
      <button
        type="button"
        onClick={() => setIsCartOpen(true)}
        className="w-full bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold px-3.5 py-2.5 rounded-xl shadow-lg flex items-center justify-between active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-amber-500 dark:bg-slate-950 text-slate-950 dark:text-amber-400 flex items-center justify-center font-extrabold text-[11px]">
            {itemCount}
          </div>
          <div className="text-left flex items-baseline gap-1.5">
            <span className="text-xs font-medium opacity-90">Cart:</span>
            <span className="text-sm font-extrabold">{formatINR(subtotalPaise)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
          <span>Checkout</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </button>
    </aside>
  );
};
