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
    <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar scroll-smooth">
      <button
        onClick={() => onSelectCategory(null)}
        className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
          selectedCategoryId === null
            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
            : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:border-slate-600'
        }`}
      >
        All Menu
      </button>

      {categories.map(cat => {
        const isSelected = selectedCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              isSelected
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:border-slate-600'
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
};
