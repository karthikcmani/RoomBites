import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Sliders,
  DollarSign,
  Coffee,
  Check,
  Send,
  MessageSquare,
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../services/api.js';
import {
  Order,
  Product,
  CustomerProfile,
  CustomerPresence,
  ShopStatus,
  StockStatus,
  PaymentMethod
} from '../types/index.js';
import { formatINR } from '../utils/currency.js';
import { useRealtime } from '../contexts/RealtimeContext.js';

export const AdminDashboard: React.FC = () => {
  const { shopSettings, refreshSettings, onlinePresence, refreshPresence } = useRealtime();

  const [activeTab, setActiveTab] = useState<'orders' | 'presence' | 'menu' | 'credit' | 'announcements'>('orders');
  const [metrics, setMetrics] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reject dialog state
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Kitchen temporarily out of stock');

  // Alternative suggestion dialog state
  const [altOrderId, setAltOrderId] = useState<string | null>(null);
  const [altOriginalProdId, setAltOriginalProdId] = useState('');
  const [altSuggestedProdId, setAltSuggestedProdId] = useState('');
  const [altNote, setAltNote] = useState('');

  // Settle dues dialog state
  const [settlingCustomer, setSettlingCustomer] = useState<CustomerProfile | null>(null);
  const [settleAmountRupees, setSettleAmountRupees] = useState('');
  const [settleDescription, setSettleDescription] = useState('Cash payment settled in room');

  // Seller room & contact location state
  const [sellerRoom, setSellerRoom] = useState(shopSettings?.roomNumber || 'Room 228, MH2');
  const [sellerPhone, setSellerPhone] = useState(shopSettings?.emergencyContact || '+919847837607');
  const [sellerUpiId, setSellerUpiId] = useState(shopSettings?.upiId || 'anikumaricmani-1@okicici');
  const [sellerUpiName, setSellerUpiName] = useState(shopSettings?.upiName || 'Karthik C Mani');
  const [isEditingSeller, setIsEditingSeller] = useState(false);

  // Announcement state
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMessage, setNewAnnMessage] = useState('');

  useEffect(() => {
    if (shopSettings?.roomNumber) setSellerRoom(shopSettings.roomNumber);
    if (shopSettings?.emergencyContact) setSellerPhone(shopSettings.emergencyContact);
    if (shopSettings?.upiId) setSellerUpiId(shopSettings.upiId);
    if (shopSettings?.upiName) setSellerUpiName(shopSettings.upiName);
  }, [shopSettings?.roomNumber, shopSettings?.emergencyContact, shopSettings?.upiId, shopSettings?.upiName]);

  const handleSaveSellerInfo = async () => {
    try {
      await api.shop.updateSettings({
        roomNumber: sellerRoom,
        emergencyContact: sellerPhone,
        upiId: sellerUpiId,
        upiName: sellerUpiName
      });
      await refreshSettings();
      setIsEditingSeller(false);
      alert('Seller details & UPI ID updated and broadcast live!');
    } catch (err: any) {
      alert(err.message || 'Failed to update seller details');
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [metRes, ordRes, prodRes, custRes] = await Promise.all([
        api.shop.getDashboardMetrics(),
        api.orders.getAdminFeed(),
        api.products.getProducts(),
        api.payments.getCustomersAdmin()
      ]);
      setMetrics(metRes.metrics || metRes);
      setOrders(ordRes.orders);
      setProducts(prodRes.products);
      setCustomers(custRes.customers);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateShopStatus = async (status: ShopStatus) => {
    try {
      await api.shop.updateSettings({ status });
      await refreshSettings();
    } catch (err: any) {
      alert(err.message || 'Failed to update shop status');
    }
  };

  const handleOrderStatus = async (orderId: string, status: any) => {
    try {
      await api.orders.updateStatusAdmin(orderId, status);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectingOrderId) return;
    try {
      await api.orders.updateStatusAdmin(rejectingOrderId, 'REJECTED', rejectionReason);
      setRejectingOrderId(null);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to reject order');
    }
  };

  const handleSuggestAlternative = async () => {
    if (!altOrderId || !altOriginalProdId || !altSuggestedProdId) return;
    try {
      await api.orders.suggestAlternativeAdmin(altOrderId, {
        originalProductId: altOriginalProdId,
        suggestedProductId: altSuggestedProdId,
        note: altNote || undefined
      });
      setAltOrderId(null);
      setAltNote('');
      await loadAll();
      alert('Alternative suggested to student!');
    } catch (err: any) {
      alert(err.message || 'Failed to suggest alternative');
    }
  };

  const handleVerifyPayment = async (order: Order) => {
    try {
      await api.payments.verifyPaymentAdmin({
        orderId: order.id,
        paymentMethod: order.paymentMethod,
        amountPaise: order.totalPaise,
        transactionRef: order.transactionRef || `MANUAL_ADMIN_${Date.now()}`
      });
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to verify payment');
    }
  };

  const handleToggleStock = async (productId: string, currentStatus: StockStatus) => {
    const nextStatus: StockStatus = currentStatus === 'IN_STOCK' ? 'OUT_OF_STOCK' : 'IN_STOCK';
    try {
      await api.products.updateStock(productId, nextStatus);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stockStatus: nextStatus } : p));
    } catch (err: any) {
      alert(err.message || 'Failed to update stock');
    }
  };

  const handleSetCreditStatus = async (userId: string, status: any) => {
    try {
      await api.payments.setCreditStatusAdmin(userId, status);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to set credit status');
    }
  };

  const handleSettleCash = async () => {
    if (!settlingCustomer || !settleAmountRupees) return;
    const amountPaise = Math.round(parseFloat(settleAmountRupees) * 100);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      alert('Enter a valid amount');
      return;
    }

    try {
      await api.payments.settleDuesAdmin(settlingCustomer.userId, amountPaise, settleDescription || undefined);
      setSettlingCustomer(null);
      setSettleAmountRupees('');
      await loadAll();
      alert('Cash settlement recorded successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to settle dues');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnMessage.trim()) return;

    try {
      await api.shop.createAnnouncement({
        title: newAnnTitle.trim(),
        message: newAnnMessage.trim()
      });
      setNewAnnTitle('');
      setNewAnnMessage('');
      alert('Announcement broadcast live to all students!');
    } catch (err: any) {
      alert(err.message || 'Failed to broadcast announcement');
    }
  };

  const activeOrders = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'REJECTED');

  return (
    <div className="max-w-4xl mx-auto px-3.5 py-3 space-y-3 pb-24 text-xs">
      {/* Operations Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div>
          <h2 className="font-extrabold text-sm sm:text-base text-text-main">Seller Operations Center</h2>
          <p className="text-[11px] text-text-muted">RIT Night Mess • Hostel Room Deliveries</p>
        </div>

        {/* Live Shop Availability Controls */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-elevated border border-border-subtle self-start sm:self-auto">
          {(['AVAILABLE', 'BUSY', 'SLEEPING', 'CLOSED'] as ShopStatus[]).map(st => {
            const isCurrent = shopSettings?.status === st;
            return (
              <button
                key={st}
                onClick={() => handleUpdateShopStatus(st)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                  isCurrent
                    ? st === 'AVAILABLE'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : st === 'BUSY'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : st === 'SLEEPING'
                      ? 'bg-indigo-600 text-white font-black shadow-xs'
                      : 'bg-rose-600 text-white font-black shadow-xs'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Seller Location & UPI Details Strip */}
      <div className="p-3 rounded-xl bg-surface border border-border-subtle flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-text-muted text-[11px] truncate">
          <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">
            Mess: <strong className="text-text-main font-semibold">{shopSettings?.roomNumber || 'Room 228, MH2'}</strong>
          </span>
          <span className="opacity-40">•</span>
          <span className="truncate">
            Contact: <strong className="text-text-main font-semibold">{shopSettings?.emergencyContact || '+919847837607'}</strong>
          </span>
          <span className="opacity-40 hidden sm:inline">•</span>
          <span className="truncate hidden sm:inline">
            UPI: <strong className="text-accent font-mono font-semibold">{shopSettings?.upiId || 'anikumaricmani-1@okicici'}</strong>
          </span>
        </div>
        <button
          onClick={() => setIsEditingSeller(!isEditingSeller)}
          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-surface-elevated text-accent hover:bg-surface-muted border border-border-subtle transition-all shrink-0"
        >
          {isEditingSeller ? 'Cancel' : 'Edit Location & UPI'}
        </button>
      </div>

      {/* Expandable Seller Location & UPI Editor */}
      {isEditingSeller && (
        <div className="p-3.5 rounded-xl bg-surface border border-border-subtle space-y-2.5 animate-in fade-in">
          <div>
            <h4 className="font-bold text-xs text-text-main">Update Mess Details & UPI Account</h4>
            <p className="text-[10px] text-text-muted">Changes are synchronized live to all customer devices.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-text-muted block mb-0.5">Room & Building</label>
              <input
                type="text"
                value={sellerRoom}
                onChange={e => setSellerRoom(e.target.value)}
                placeholder="e.g. Room 228, MH2"
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs text-text-main"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-text-muted block mb-0.5">Contact Phone</label>
              <input
                type="text"
                value={sellerPhone}
                onChange={e => setSellerPhone(e.target.value)}
                placeholder="e.g. +919847837607"
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs text-text-main"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-text-muted block mb-0.5">UPI ID for Payments</label>
              <input
                type="text"
                value={sellerUpiId}
                onChange={e => setSellerUpiId(e.target.value)}
                placeholder="e.g. anikumaricmani-1@okicici"
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs font-mono text-accent"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-text-muted block mb-0.5">Payee Name on Bank Account</label>
              <input
                type="text"
                value={sellerUpiName}
                onChange={e => setSellerUpiName(e.target.value)}
                placeholder="e.g. Karthik C Mani"
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs text-text-main"
              />
            </div>
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              onClick={() => setIsEditingSeller(false)}
              className="px-2.5 py-1 rounded-lg text-xs text-text-muted hover:text-text-main"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSellerInfo}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-accent text-slate-950 transition-opacity hover:opacity-95 shadow-xs"
            >
              Save & Broadcast
            </button>
          </div>
        </div>
      )}

      {/* Operational Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-3 rounded-xl bg-surface border border-border-subtle">
          <div className="flex items-center justify-between text-text-muted text-[10px] font-semibold">
            <span>Today's Orders</span>
            <ShoppingBag className="w-3.5 h-3.5 text-accent" />
          </div>
          <p className="text-xl font-extrabold text-text-main mt-1">{metrics?.todayOrdersCount || 0}</p>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-border-subtle">
          <div className="flex items-center justify-between text-text-muted text-[10px] font-semibold">
            <span>Realized Sales</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(metrics?.todaySalesPaise || 0)}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-border-subtle">
          <div className="flex items-center justify-between text-text-muted text-[10px] font-semibold">
            <span>Outstanding Dues</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {formatINR(metrics?.outstandingBalancePaise || 0)}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-border-subtle">
          <div className="flex items-center justify-between text-text-muted text-[10px] font-semibold">
            <span>Online Students</span>
            <Users className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <p className="text-xl font-extrabold text-text-main mt-1">{onlinePresence.length}</p>
        </div>
      </div>

      {/* Tab Navigation Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar border-b border-border-subtle pb-2">
        {[
          { key: 'orders', label: `Active Orders (${activeOrders.length})` },
          { key: 'presence', label: `Live Presence (${onlinePresence.length})` },
          { key: 'menu', label: `Catalog (${products.length})` },
          { key: 'credit', label: `Credit Ledger (${customers.length})` },
          { key: 'announcements', label: 'Broadcast' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              activeTab === tab.key
                ? 'bg-accent text-slate-950 font-bold shadow-xs'
                : 'bg-surface text-text-muted hover:text-text-main hover:bg-surface-elevated'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Orders Pipeline */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-text-main">Kitchen Order Queue</h3>
            <button
              onClick={loadAll}
              className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-main"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <div className="text-center py-10 rounded-xl bg-surface border border-border-subtle">
              <ShoppingBag className="w-7 h-7 text-text-dim mx-auto mb-1.5" />
              <p className="text-xs text-text-muted font-semibold">No active orders right now.</p>
              <p className="text-[11px] text-text-dim">Incoming student orders will chime automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {activeOrders.map(order => (
                <div
                  key={order.id}
                  className="p-3.5 rounded-xl bg-surface border border-border-subtle space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-text-main">#{order.orderNumber}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-text-main mt-0.5">
                        Room: <span className="text-accent">{order.deliveryRoom}</span>
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {order.customerProfile?.fullName || 'Student'} • {order.customerProfile?.phoneNumber || 'No phone'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-xs sm:text-sm text-text-main">
                        {formatINR(order.totalPaise)}
                      </span>
                      <p className="text-[10px] font-bold text-text-muted mt-0.5">
                        {order.paymentMethod} •{' '}
                        <span className={order.paymentStatus === 'VERIFIED' ? 'text-emerald-500' : 'text-amber-500'}>
                          {order.paymentStatus}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Order items */}
                  <div className="p-2 rounded-lg bg-surface-elevated text-xs space-y-0.5">
                    {order.items?.map(it => (
                      <div key={it.id} className="flex justify-between text-[11px]">
                        <span className="text-text-main">{it.quantity}x {it.productName}</span>
                        <span className="text-text-muted">{formatINR(it.subtotalPaise)}</span>
                      </div>
                    ))}
                    {order.specialInstructions && (
                      <p className="text-[10px] text-accent pt-1 italic border-t border-border-subtle">
                        Note: "{order.specialInstructions}"
                      </p>
                    )}
                  </div>

                  {/* Action transitions */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {order.status === 'PLACED' && (
                      <>
                        <button
                          onClick={() => handleOrderStatus(order.id, 'ACCEPTED')}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs shadow-xs"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => {
                            setAltOrderId(order.id);
                            if (order.items && order.items.length > 0) {
                              setAltOriginalProdId(order.items[0].productId);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-surface-elevated text-accent font-bold text-xs border border-border-subtle"
                        >
                          Substitute
                        </button>
                        <button
                          onClick={() => setRejectingOrderId(order.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-rose-500/10 text-rose-500 font-bold text-xs border border-border-subtle"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {order.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleOrderStatus(order.id, 'PREPARING')}
                        className="flex-1 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs shadow-xs"
                      >
                        Start Cooking (Preparing)
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => handleOrderStatus(order.id, 'OUT_FOR_DELIVERY')}
                        className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs"
                      >
                        Out for Delivery →
                      </button>
                    )}

                    {order.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        onClick={() => handleOrderStatus(order.id, 'DELIVERED')}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs shadow-xs"
                      >
                        Mark Delivered ✓
                      </button>
                    )}

                    {order.paymentStatus === 'PENDING' && (
                      <div className="flex items-center gap-1.5">
                        {order.transactionRef && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 truncate max-w-[140px]">
                            UTR: {order.transactionRef}
                          </span>
                        )}
                        <button
                          onClick={() => handleVerifyPayment(order)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface-elevated text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-border-subtle hover:bg-emerald-500/10 transition-colors"
                          title="Mark payment verified"
                        >
                          Verify Payment
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Live Presence */}
      {activeTab === 'presence' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-text-main">Connected Students & Guests</h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-muted">{onlinePresence.length} active</span>
              <button
                onClick={() => refreshPresence()}
                className="p-1 rounded-lg bg-surface-elevated text-text-muted hover:text-text-main"
                title="Refresh roster"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {onlinePresence.length === 0 ? (
            <div className="text-center py-10 rounded-xl bg-surface border border-border-subtle text-text-muted">
              No students currently active.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-elevated border-b border-border-subtle text-text-muted">
                  <tr>
                    <th className="p-2.5">User</th>
                    <th className="p-2.5">Room</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-text-main">
                  {onlinePresence.map(p => (
                    <tr key={p.userId} className="hover:bg-surface-elevated">
                      <td className="p-2.5 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{p.name || 'Student'}</span>
                      </td>
                      <td className="p-2.5 text-text-muted">{p.roomNumber || 'Unknown'}</td>
                      <td className="p-2.5">
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Online
                        </span>
                      </td>
                      <td className="p-2.5 text-text-dim text-[11px]">{p.activity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Catalog & Realtime Stock */}
      {activeTab === 'menu' && (
        <div className="space-y-3">
          <h3 className="font-bold text-xs text-text-main">Product Inventory & Stock Controls</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {products.map(p => (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-surface border border-border-subtle flex items-center justify-between gap-2"
              >
                <div className="min-w-0 pr-1">
                  <h4 className="font-bold text-xs text-text-main truncate">{p.name}</h4>
                  <p className="text-xs font-bold text-text-main mt-0.5">{formatINR(p.pricePaise)}</p>
                  <p className="text-[10px] text-text-dim">{p.categoryId}</p>
                </div>

                <div className="shrink-0">
                  <button
                    onClick={() => handleToggleStock(p.id, p.stockStatus)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                      p.stockStatus === 'IN_STOCK'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {p.stockStatus === 'IN_STOCK' ? 'In Stock' : 'Sold Out'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Student Credit Management */}
      {activeTab === 'credit' && (
        <div className="space-y-3">
          <h3 className="font-bold text-xs text-text-main">Student Credit Approval & Settlements</h3>
          <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-elevated border-b border-border-subtle text-text-muted">
                <tr>
                  <th className="p-2.5">Student</th>
                  <th className="p-2.5">Room</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Unpaid Dues</th>
                  <th className="p-2.5">Owed</th>
                  <th className="p-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-text-main">
                {customers.map(c => (
                  <tr key={c.userId} className="hover:bg-surface-elevated">
                    <td className="p-2.5 font-bold">{c.fullName}</td>
                    <td className="p-2.5 text-text-muted">{c.roomNumber}</td>
                    <td className="p-2.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        c.creditStatus === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : c.creditStatus === 'REQUESTED'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse'
                          : 'bg-surface-muted text-text-dim'
                      }`}>
                        {c.creditStatus}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold">
                      <span className={c.unpaidOrdersCount > 2 ? 'text-rose-500' : 'text-text-muted'}>
                        {c.unpaidOrdersCount} / 2
                      </span>
                    </td>
                    <td className="p-2.5 font-extrabold text-accent">
                      {formatINR(c.outstandingBalancePaise)}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        {c.creditStatus === 'REQUESTED' && (
                          <button
                            onClick={() => handleSetCreditStatus(c.userId, 'APPROVED')}
                            className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold text-[10px]"
                          >
                            Approve
                          </button>
                        )}
                        {c.creditStatus === 'APPROVED' && (
                          <button
                            onClick={() => handleSetCreditStatus(c.userId, 'REVOKED')}
                            className="px-2 py-0.5 rounded bg-surface-muted hover:bg-rose-500/10 text-rose-500 font-bold text-[10px]"
                          >
                            Revoke
                          </button>
                        )}
                        {c.outstandingBalancePaise > 0 && (
                          <button
                            onClick={() => setSettlingCustomer(c)}
                            className="px-2 py-0.5 rounded bg-accent-surface hover:bg-accent text-accent-text hover:text-slate-950 font-bold text-[10px]"
                          >
                            Settle
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Announcements */}
      {activeTab === 'announcements' && (
        <div className="max-w-md mx-auto space-y-3">
          <h3 className="font-bold text-xs text-text-main">Broadcast Notification to All Students</h3>
          <form onSubmit={handleCreateAnnouncement} className="p-3.5 rounded-xl bg-surface border border-border-subtle space-y-2.5">
            <input
              type="text"
              required
              placeholder="Title (e.g. Fresh Bananas Available Tonight)"
              value={newAnnTitle}
              onChange={e => setNewAnnTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border-subtle text-xs text-text-main"
            />
            <textarea
              required
              rows={3}
              placeholder="Message details..."
              value={newAnnMessage}
              onChange={e => setNewAnnMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border-subtle text-xs text-text-main"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-accent text-slate-950 font-bold text-xs shadow-xs hover:opacity-95"
            >
              Broadcast Notification
            </button>
          </form>
        </div>
      )}

      {/* Alternative Suggestion Modal */}
      {altOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border-subtle w-full max-w-sm rounded-2xl p-4 space-y-3 shadow-xl">
            <h4 className="font-bold text-sm text-text-main">Suggest Product Alternative</h4>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Select Replacement Product</label>
              <select
                value={altSuggestedProdId}
                onChange={e => setAltSuggestedProdId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs text-text-main"
              >
                <option value="">Choose product...</option>
                {products.filter(p => p.id !== altOriginalProdId).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatINR(p.pricePaise)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Note to Student</label>
              <input
                type="text"
                placeholder="e.g. Out of Horlicks, Boost available"
                value={altNote}
                onChange={e => setAltNote(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs text-text-main"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setAltOrderId(null)}
                className="flex-1 py-1.5 rounded-lg bg-surface-elevated text-text-muted font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSuggestAlternative}
                className="flex-1 py-1.5 rounded-lg bg-accent text-slate-950 font-bold text-xs"
              >
                Send Suggestion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Order Modal */}
      {rejectingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border-subtle w-full max-w-sm rounded-2xl p-4 space-y-3 shadow-xl">
            <h4 className="font-bold text-sm text-text-main">Reject Order</h4>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Reason for Rejection</label>
              <input
                type="text"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs text-text-main"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setRejectingOrderId(null)}
                className="flex-1 py-1.5 rounded-lg bg-surface-elevated text-text-muted font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectOrder}
                className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Settlement Modal */}
      {settlingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border-subtle w-full max-w-sm rounded-2xl p-4 space-y-3 shadow-xl">
            <h4 className="font-bold text-sm text-text-main">Settle Cash Dues</h4>
            <p className="text-xs text-text-muted">
              Student: <strong className="text-text-main">{settlingCustomer.fullName}</strong> ({settlingCustomer.roomNumber})
            </p>
            <p className="text-xs text-text-muted">
              Current Balance: <strong className="text-accent">{formatINR(settlingCustomer.outstandingBalancePaise)}</strong>
            </p>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Amount Settled in Cash (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 50"
                value={settleAmountRupees}
                onChange={e => setSettleAmountRupees(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs text-text-main font-bold"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSettlingCustomer(null)}
                className="flex-1 py-1.5 rounded-lg bg-surface-elevated text-text-muted font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSettleCash}
                className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                Record Settlement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
