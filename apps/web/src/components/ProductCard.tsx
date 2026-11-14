import React, { useState } from 'react';
import { Plus, Minus, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Product } from '../types/index.js';
import { formatINR } from '../utils/currency.js';
import { useCart } from '../contexts/CartContext.js';
import { ProductCustomizerModal } from './ProductCustomizerModal.js';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { items, addItem, updateQuantity } = useCart();
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  const cartItemsForProduct = items.filter(it => it.product.id === product.id);
  const totalQtyInCart = cartItemsForProduct.reduce((sum, it) => sum + it.quantity, 0);

  const isSoldOut = product.stockStatus === 'OUT_OF_STOCK' || !product.isAvailable;

  const handleAddClick = () => {
    if (isSoldOut) return;
    if (product.hasCustomization && product.customizationSchema) {
      setIsCustomizerOpen(true);
    } else {
      addItem(product, 1);
    }
  };

  const handleCustomizerConfirm = (options: Record<string, string>) => {
    addItem(product, 1, options);
    setIsCustomizerOpen(false);
  };

  const handleMinus = () => {
    if (cartItemsForProduct.length > 0) {
      const last = cartItemsForProduct[cartItemsForProduct.length - 1];
      updateQuantity(product.id, last.quantity - 1, last.selectedOptions);
    }
  };

  const handlePlus = () => {
    if (product.hasCustomization) {
      setIsCustomizerOpen(true);
    } else if (cartItemsForProduct.length > 0) {
      const first = cartItemsForProduct[0];
      updateQuantity(product.id, first.quantity + 1, first.selectedOptions);
    } else {
      addItem(product, 1);
    }
  };

  return (
    <>
      <div className={`group bg-slate-850/90 border rounded-2xl p-4 flex items-center justify-between gap-4 transition-all ${
        isSoldOut
          ? 'border-slate-800/60 opacity-60'
          : 'border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-amber-500/5'
      }`}>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-sm text-slate-100 group-hover:text-amber-400 transition-colors truncate">
              {product.name}
            </h4>
            {product.hasCustomization && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                <Sparkles className="w-2.5 h-2.5" />
                Customizable
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">
            {product.description}
          </p>

          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-amber-400">
              {formatINR(product.pricePaise)}
            </span>

            {product.stockStatus === 'LOW_STOCK' && (
              <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                Few Left
              </span>
            )}

            {isSoldOut && (
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                Sold Out Tonight
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex flex-col items-center">
          {isSoldOut ? (
            <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-500 text-xs font-bold cursor-not-allowed">
              Unavailable
            </div>
          ) : totalQtyInCart > 0 ? (
            <div className="flex items-center bg-amber-500/10 border border-amber-500/30 rounded-xl p-1 gap-2">
              <button
                onClick={handleMinus}
                className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center hover:bg-amber-400 active:scale-95 transition-all"
              >
                <Minus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
              <span className="text-xs font-bold text-amber-400 min-w-4 text-center">
                {totalQtyInCart}
              </span>
              <button
                onClick={handlePlus}
                className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center hover:bg-amber-400 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddClick}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all active:scale-95 shadow-md shadow-amber-500/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              ADD
            </button>
          )}

          {product.hasCustomization && totalQtyInCart > 0 && (
            <button
              onClick={() => setIsCustomizerOpen(true)}
              className="mt-1 text-[10px] text-slate-400 hover:text-amber-400 underline underline-offset-2 flex items-center gap-0.5"
            >
              <SlidersHorizontal className="w-2.5 h-2.5" />
              Custom
            </button>
          )}
        </div>
      </div>

      <ProductCustomizerModal
        product={product}
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        onConfirm={handleCustomizerConfirm}
      />
    </>
  );
};
