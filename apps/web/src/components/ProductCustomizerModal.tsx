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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white">{product.name}</h3>
            <p className="text-xs text-amber-400 font-semibold">{formatINR(product.pricePaise)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(schema).map(([optionKey, values]) => (
            <div key={optionKey} className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {optionKey}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {values.map(val => {
                  const isSelected = selectedOptions[optionKey] === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelect(optionKey, val)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <span>{val}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-850 border-t border-slate-800">
          <button
            onClick={() => onConfirm(selectedOptions)}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors shadow-lg shadow-amber-500/20"
          >
            Add to Order • {formatINR(product.pricePaise)}
          </button>
        </div>
      </div>
    </div>
  );
};
