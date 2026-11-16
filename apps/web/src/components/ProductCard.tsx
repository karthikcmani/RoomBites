import React, { useState } from 'react';
import { Plus, Minus, Sparkles, Coffee, Utensils } from 'lucide-react';
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
      <div
        className={`bg-surface border border-border-subtle rounded-xl p-3 flex items-center justify-between gap-3 transition-all ${
          isSoldOut
            ? 'opacity-60 bg-surface/50'
            : 'hover:border-border-strong hover:shadow-sm'
        }`}
      >
        {/* Left: Product Details */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="font-bold text-xs sm:text-sm text-text-main truncate">
              {product.name}
            </h4>
            {product.hasCustomization && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-accent bg-accent-surface px-1.5 py-0.2 rounded">
                <Sparkles className="w-2.5 h-2.5" />
                Custom
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-[11px] text-text-muted line-clamp-1 mb-1.5">
              {product.description}
            </p>
          )}

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs sm:text-sm text-text-main">
              {formatINR(product.pricePaise)}
            </span>

            {product.stockStatus === 'LOW_STOCK' && (
              <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                Few left
              </span>
            )}

            {isSoldOut && (
              <span className="text-[9px] font-semibold text-text-dim bg-surface-muted px-1.5 py-0.2 rounded">
                Sold Out
              </span>
            )}
          </div>
        </div>

        {/* Right: Compact Add / Quantity Controls */}
        <div className="shrink-0">
          {isSoldOut ? (
            <span className="px-2.5 py-1 text-[11px] font-semibold text-text-dim rounded-lg bg-surface-muted cursor-not-allowed">
              Out
            </span>
          ) : totalQtyInCart > 0 ? (
            <div className="flex items-center rounded-lg bg-surface-elevated border border-border-subtle p-0.5">
              <button
                type="button"
                onClick={handleMinus}
                className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-main hover:bg-surface active:scale-95 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-xs font-bold text-text-main">
                {totalQtyInCart}
              </span>
              <button
                type="button"
                onClick={handlePlus}
                className="w-7 h-7 flex items-center justify-center rounded-md text-accent hover:bg-surface active:scale-95 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddClick}
              className="px-3.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-accent hover:text-slate-950 text-text-main border border-border-subtle hover:border-accent font-bold text-xs transition-all active:scale-95 flex items-center gap-1 shadow-2xs"
            >
              <span>Add</span>
              <Plus className="w-3 h-3 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Product Customizer Modal */}
      {product.hasCustomization && (
        <ProductCustomizerModal
          product={product}
          isOpen={isCustomizerOpen}
          onClose={() => setIsCustomizerOpen(false)}
          onConfirm={handleCustomizerConfirm}
        />
      )}
    </>
  );
};
