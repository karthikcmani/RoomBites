import React, { useState, useEffect } from 'react';
import { ShoppingBag, Clock, RotateCcw, ChevronRight } from 'lucide-react';
import { api } from '../services/api.js';
import { Order } from '../types/index.js';
import { formatINR } from '../utils/currency.js';
import { useCart } from '../contexts/CartContext.js';
import { useAuth } from '../contexts/AuthContext.js';

interface OrderHistoryProps {
  onSelectOrder: (order: Order) => void;
  onOpenAuth: () => void;
}

export const OrderHistoryPage: React.FC<OrderHistoryProps> = ({ onSelectOrder, onOpenAuth }) => {
  const { user } = useAuth();
  const { addItem, setIsCartOpen } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrders();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.orders.getMyOrders();
      setOrders(res.orders);
    } catch (err) {
      console.error('Failed to load past orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorder = async (order: Order) => {
    try {
      // Fetch latest menu to verify prices and availability
      const prodsRes = await api.products.getProducts();
      const liveProducts = prodsRes.products;

      let addedCount = 0;
      if (order.items) {
        for (const item of order.items) {
          const liveProd = liveProducts.find(p => p.id === item.productId);
          if (liveProd && liveProd.isAvailable && liveProd.stockStatus !== 'OUT_OF_STOCK') {
            addItem(liveProd, item.quantity, item.selectedOptions);
            addedCount++;
          }
        }
      }

      if (addedCount > 0) {
        setIsCartOpen(true);
      } else {
        alert('Items from this order are currently out of stock tonight.');
      }
    } catch (err) {
      console.error('Error during reorder:', err);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-amber-400 mx-auto">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-base text-white">Sign In to View Orders</h3>
        <p className="text-xs text-slate-400">
          Track active deliveries and review your past midnight orders.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
        >
          Sign In with RIT Email
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-lg text-white">Your Order History</h2>
        <span className="text-xs text-slate-400">{orders.length} orders placed</span>
      </div>

      {isLoading ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-slate-850/50 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No orders placed yet.</p>
          <p className="text-xs text-slate-500">Your midnight food orders will show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div
              key={order.id}
              className="p-4 rounded-2xl bg-slate-850/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white">
                      #{order.orderNumber}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {order.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString()} at{' '}
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-sm text-amber-400">
                    {formatINR(order.totalPaise)}
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {order.paymentMethod} • {order.paymentStatus}
                  </p>
                </div>
              </div>

              {/* Items summary */}
              <div className="text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80">
                {order.items?.map(it => (
                  <div key={it.id} className="flex justify-between py-0.5">
                    <span>
                      {it.quantity}x {it.productName}
                    </span>
                    <span className="text-slate-400">{formatINR(it.subtotalPaise)}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onSelectOrder(order)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Track Status</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleReorder(order)}
                  className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reorder</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
