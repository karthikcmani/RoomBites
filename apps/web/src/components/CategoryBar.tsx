import React from 'react';
import { Category } from '../types/index.js';

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar scroll-smooth">
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
          selectedCategoryId === null
            ? 'bg-accent text-slate-950 font-bold shadow-sm'
            : 'bg-surface-elevated text-text-muted hover:text-text-main hover:bg-surface-muted'
        }`}
      >
        All Menu
      </button>

      {categories.map(cat => {
        const isSelected = selectedCategoryId === cat.id;
        return (
          <button
            type="button"
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              isSelected
                ? 'bg-accent text-slate-950 font-bold shadow-sm'
                : 'bg-surface-elevated text-text-muted hover:text-text-main hover:bg-surface-muted'
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
};
