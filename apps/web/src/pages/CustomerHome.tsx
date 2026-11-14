import React, { useState, useEffect } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { api } from '../services/api.js';
import { Category, Product } from '../types/index.js';
import { ShopStatusBanner } from '../components/ShopStatusBanner.js';
import { CategoryBar } from '../components/CategoryBar.js';
import { ProductCard } from '../components/ProductCard.js';

export const CustomerHome: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedCategoryId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [catsRes, prodsRes] = await Promise.all([
        api.products.getCategories(),
        api.products.getProducts(selectedCategoryId || undefined)
      ]);
      setCategories(catsRes.categories);
      setProducts(prodsRes.products);
    } catch (err) {
      console.error('Failed to load menu data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 pb-24 space-y-4">
      {/* Top Banner & Operating Hours */}
      <ShopStatusBanner />

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Search midnight tea, coffee, Maggi, biscuits..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-850/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 shadow-inner"
        />
      </div>

      {/* Categories Bar */}
      <CategoryBar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      {/* Menu Header */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Midnight Menu
        </h3>
        <span className="text-xs text-slate-400 font-medium">
          {filteredProducts.length} items available
        </span>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-slate-850/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-slate-400 text-sm font-semibold">No items match your search.</p>
          <p className="text-slate-500 text-xs">Try searching for tea, coffee, or snacks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredProducts.map(prod => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}
    </div>
  );
};
