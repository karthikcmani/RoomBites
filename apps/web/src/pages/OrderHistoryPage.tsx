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

  const handleReorder = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
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
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center text-accent mx-auto">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-sm text-text-main">Sign In to View Orders</h3>
        <p className="text-xs text-text-muted">
          Track active room deliveries and review your past midnight orders.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-5 py-2 rounded-xl bg-accent text-slate-950 font-bold text-xs active:scale-95 transition-all shadow-sm"
        >
          Sign In with RIT Email
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold';
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-3.5 py-4 space-y-3 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm text-text-main">Order History</h2>
        <span className="text-xs text-text-dim">{orders.length} orders placed</span>
      </div>

      {isLoading ? (
        <div className="space-y-2 py-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-surface border border-border-subtle animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <ShoppingBag className="w-8 h-8 text-text-dim mx-auto" />
          <p className="text-xs font-semibold text-text-muted">No orders yet</p>
          <p className="text-[11px] text-text-dim">Your midnight snacks will appear here once placed.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <div
              key={order.id}
              onClick={() => onSelectOrder(order)}
              className="p-3 rounded-xl bg-surface border border-border-subtle hover:border-border-strong cursor-pointer transition-all active:scale-[0.99] flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-text-main">#{order.orderNumber}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${getStatusBadge(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <span className="font-extrabold text-xs text-text-main">{formatINR(order.totalPaise)}</span>
              </div>

              <div className="text-[11px] text-text-muted line-clamp-1">
                {order.items?.map(it => `${it.quantity}x ${it.productName}`).join(', ')}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border-subtle text-[11px] text-text-dim">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span>Room {order.deliveryRoom}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleReorder(order, e)}
                    className="flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reorder</span>
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-text-dim" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
