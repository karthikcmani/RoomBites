import React, { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';
import { Category, Product } from '../types/index.js';
import { ShopStatusBanner } from '../components/ShopStatusBanner.js';
import { CategoryBar } from '../components/CategoryBar.js';
import { ProductCard } from '../components/ProductCard.js';
import { ServerSettingsModal } from '../components/ServerSettingsModal.js';

export const CustomerHome: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedCategoryId]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [catsRes, prodsRes] = await Promise.all([
        api.products.getCategories(),
        api.products.getProducts(selectedCategoryId || undefined)
      ]);
      setCategories(catsRes.categories);
      setProducts(prodsRes.products);
    } catch (err: any) {
      console.error('Failed to load menu data:', err);
      setLoadError(err.message || 'Unable to connect to server.');
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
    <div className="max-w-4xl mx-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+6rem)] space-y-3">
      {/* Operating Status Banner (Only visible when Kitchen is Sleeping/Busy) */}
      <ShopStatusBanner />

      {/* Minimal Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search tea, coffee, snacks, Maggi..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
        />
      </div>

      {/* Minimal Category Bar */}
      <CategoryBar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 rounded-xl bg-slate-900/60 border border-slate-800/80 animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-slate-300 text-xs font-semibold">Unable to connect to kitchen server</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={loadData}
              className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="py-1.5 px-3 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs"
            >
              Settings
            </button>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 space-y-1">
          <p className="text-slate-400 text-xs font-medium">No items found</p>
          <p className="text-slate-500 text-[11px]">Try searching for tea or Maggi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {filteredProducts.map(prod => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}

      {/* In-app Server Configuration Modal */}
      <ServerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
};
