import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, MapPin, Phone } from 'lucide-react';
import { api } from '../services/api.js';
import { Category, Product } from '../types/index.js';
import { useRealtime } from '../contexts/RealtimeContext.js';
import { ShopStatusBanner } from '../components/ShopStatusBanner.js';
import { CategoryBar } from '../components/CategoryBar.js';
import { ProductCard } from '../components/ProductCard.js';

export const CustomerHome: React.FC = () => {
  const { shopSettings } = useRealtime();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCategoryId]);

  // Real-time instant live stock update listener
  useEffect(() => {
    const handleProductUpdated = (event: any) => {
      const updated: Product = event.detail?.product;
      if (!updated) return;
      setProducts(prev => {
        const index = prev.findIndex(p => p.id === updated.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = { ...next[index], ...updated };
          return next;
        }
        return [updated, ...prev];
      });
    };

    window.addEventListener('roombites:product-updated', handleProductUpdated);
    return () => {
      window.removeEventListener('roombites:product-updated', handleProductUpdated);
    };
  }, []);

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
      setLoadError(err.message || 'Unable to connect to kitchen server.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
  });

  return (
    <div className="max-w-2xl mx-auto px-3.5 py-2.5 pb-24 space-y-2.5">
      {/* Operating Status Notification (Only visible when Sleeping / Busy / Closed) */}
      <ShopStatusBanner />

      {/* Compact Delivery Origin Strip */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-elevated text-[11px] text-text-muted">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">
            Delivering from: <strong className="text-text-main font-semibold">{shopSettings?.roomNumber || 'Room 228, MH2'}</strong>
          </span>
        </div>
        {shopSettings?.emergencyContact && (
          <a
            href={`tel:${shopSettings.emergencyContact}`}
            className="flex items-center gap-1 font-bold text-accent shrink-0 hover:underline ml-2"
          >
            <Phone className="w-3 h-3" />
            <span>{shopSettings.emergencyContact}</span>
          </a>
        )}
      </div>

      {/* Minimal Search Field */}
      <div className="relative">
        <Search className="w-4 h-4 text-text-dim absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search tea, coffee, snacks, Maggi..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main placeholder-text-dim focus:outline-none transition-colors"
        />
      </div>

      {/* Category Filter Chips */}
      <CategoryBar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-20 rounded-xl bg-surface border border-border-subtle animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="text-center py-10 space-y-2.5">
          <p className="text-text-muted text-xs font-semibold">Unable to connect to kitchen server</p>
          <button
            onClick={loadData}
            className="py-1.5 px-3 rounded-lg bg-accent text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-10 space-y-1">
          <p className="text-text-muted text-xs font-semibold">No items found</p>
          <p className="text-text-dim text-[11px]">Try searching for tea, coffee, or snacks</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
          {filteredProducts.map(prod => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}
    </div>
  );
};
