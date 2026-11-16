import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Product } from '../types/index.js';
import { formatINR } from '../utils/currency.js';

interface CustomizerModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: Record<string, string>) => void;
}

export const ProductCustomizerModal: React.FC<CustomizerModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  const schema = product.customizationSchema || {};
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const [key, values] of Object.entries(schema)) {
      if (Array.isArray(values) && values.length > 0) {
        defaults[key] = values[0];
      }
    }
    return defaults;
  });

  const handleSelect = (key: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border-subtle w-full max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-border-subtle">
          <div>
            <h3 className="font-bold text-sm text-text-main">{product.name}</h3>
            <p className="text-xs text-text-muted font-bold">{formatINR(product.pricePaise)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-surface-elevated flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-3.5 space-y-3 max-h-[60vh] overflow-y-auto text-xs">
          {Object.entries(schema).map(([optionKey, values]) => (
            <div key={optionKey} className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                {optionKey}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {Array.isArray(values) && values.map(val => {
                  const isSelected = selectedOptions[optionKey] === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelect(optionKey, val)}
                      className={`p-2 rounded-xl text-xs font-semibold text-center transition-all flex items-center justify-between border ${
                        isSelected
                          ? 'border-accent bg-accent-surface text-accent font-bold shadow-2xs'
                          : 'border-border-subtle bg-surface hover:bg-surface-elevated text-text-muted'
                      }`}
                    >
                      <span className="truncate">{val}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-accent stroke-[3] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border-subtle bg-surface">
          <button
            type="button"
            onClick={() => onConfirm(selectedOptions)}
            className="w-full py-2.5 rounded-xl bg-accent text-slate-950 font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all"
          >
            Add to Cart ({formatINR(product.pricePaise)})
          </button>
        </div>
      </div>
    </div>
  );
};
