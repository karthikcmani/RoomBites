import React, { useState, useEffect } from 'react';
import { Search, Sparkles, AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { api } from '../services/api.js';
import { Category, Product } from '../types/index.js';
import { ShopStatusBanner } from '../components/ShopStatusBanner.js';
import { CategoryBar } from '../components/CategoryBar.js';
import { ProductCard } from '../components/ProductCard.js';
import { ServerSettingsModal } from '../components/ServerSettingsModal.js';
import { getServerBaseUrl } from '../config/apiConfig.js';

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
      setLoadError(err.message || 'Failed to connect to menu service.');
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
    <div className="max-w-5xl mx-auto px-4 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+6rem)] space-y-4">
      {/* Top Banner & Operating Hours */}
      <ShopStatusBanner />

      {/* Connection Failure Alert Banner */}
      {loadError && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/40 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-xs text-rose-200">Unable to Connect to RoomBites Menu</h4>
              <p className="text-[11px] text-rose-300/90 mt-0.5 leading-relaxed">{loadError}</p>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                Target: {getServerBaseUrl() || 'Relative / Localhost'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={loadData}
              className="py-1.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              Server Settings
            </button>
          </div>
        </div>
      )}

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
      ) : loadError ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-slate-400 text-sm font-semibold">Catalogue Offline</p>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            The menu could not be loaded because the backend is currently unreachable.
          </p>
          <button
            onClick={loadData}
            className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
          >
            Retry Now
          </button>
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

      {/* In-app Server Configuration Modal */}
      <ServerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
};
