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
  MapPin
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

  // Seller room & contact location state
  const [sellerRoom, setSellerRoom] = useState(shopSettings?.roomNumber || "Room 101 (Men's Hostel)");
  const [sellerPhone, setSellerPhone] = useState(shopSettings?.emergencyContact || '+919876543210');
  const [sellerUpiId, setSellerUpiId] = useState(shopSettings?.upiId || 'anikumaricmani-1@okicici');
  const [sellerUpiName, setSellerUpiName] = useState(shopSettings?.upiName || 'Karthik C Mani');
  const [isEditingSeller, setIsEditingSeller] = useState(false);

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
      alert('Seller details & UPI ID updated & broadcast live to all students!');
    } catch (err: any) {
      alert(err.message || 'Failed to update seller details');
    }
  };
  const [settleDescription, setSettleDescription] = useState('Cash payment settled in room');

  // Announcement state
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMessage, setNewAnnMessage] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [metRes, ordRes, prodRes, custRes] = await Promise.all([
        api.shop.getDashboardMetrics(),
        api.orders.getAdminFeed(),
        api.products.getAllAdmin(),
        api.payments.getCustomersAdmin()
      ]);
      setMetrics(metRes.metrics);
      setOrders(ordRes.orders);
      setProducts(prodRes.products);
      setCustomers(custRes.customers);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateShopStatus = async (status: ShopStatus) => {
    try {
      await api.shop.updateSettings({ status });
      await refreshSettings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOrderStatus = async (orderId: string, status: any, reason?: string) => {
    try {
      const res = await api.orders.updateStatusAdmin(orderId, status, reason);
      setOrders(prev => prev.map(o => o.id === orderId ? res.order : o));
      loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVerifyPayment = async (order: Order) => {
    try {
      await api.payments.verifyPaymentAdmin({
        orderId: order.id,
        paymentMethod: order.paymentMethod,
        amountPaise: order.totalPaise,
        transactionRef: 'VERIFIED_BY_ADMIN'
      });
      loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSuggestAlternative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!altOrderId || !altOriginalProdId || !altSuggestedProdId) return;

    try {
      await api.orders.suggestAlternativeAdmin(altOrderId, {
        originalProductId: altOriginalProdId,
        suggestedProductId: altSuggestedProdId,
        note: altNote.trim() || undefined
      });
      setAltOrderId(null);
      loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleStock = async (prodId: string, current: StockStatus) => {
    const nextStatus: StockStatus = current === 'IN_STOCK' ? 'OUT_OF_STOCK' : 'IN_STOCK';
    try {
      const res = await api.products.updateStock(prodId, nextStatus);
      setProducts(prev => prev.map(p => p.id === prodId ? res.product : p));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSetCreditStatus = async (userId: string, status: 'APPROVED' | 'REVOKED' | 'DISABLED') => {
    try {
      const res = await api.payments.setCreditStatusAdmin(userId, status);
      setCustomers(prev => prev.map(c => c.userId === userId ? res.profile : c));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSettleDues = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingCustomer || !settleAmountRupees) return;
    const amountPaise = Math.round(parseFloat(settleAmountRupees) * 100);

    try {
      const res = await api.payments.settleDuesAdmin(
        settlingCustomer.userId,
        amountPaise,
        settleDescription
      );
      setCustomers(prev => prev.map(c => c.userId === settlingCustomer.userId ? res.profile : c));
      setSettlingCustomer(null);
      setSettleAmountRupees('');
      loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle || !newAnnMessage) return;

    try {
      await api.shop.createAnnouncement({
        title: newAnnTitle,
        message: newAnnMessage,
        badgeType: 'SPECIAL'
      });
      setNewAnnTitle('');
      setNewAnnMessage('');
      alert('Announcement broadcasted to student screens.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const activeOrders = orders.filter(o =>
    ['PLACED', 'AWAITING_APPROVAL', 'ACCEPTED', 'PAYMENT_PENDING', 'PAID', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(o.status)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-xl text-white">Seller Command Center</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Admin
            </span>
          </div>
          <p className="text-xs text-slate-400">Night Mess Operations • Hostel Room Deliveries</p>
        </div>

        {/* Emergency Kitchen Status Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-850 border border-slate-800">
          {(['AVAILABLE', 'BUSY', 'SLEEPING', 'CLOSED'] as ShopStatus[]).map(st => {
            const isCurrent = shopSettings?.status === st;
            return (
              <button
                key={st}
                onClick={() => handleUpdateShopStatus(st)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all ${
                  isCurrent
                    ? st === 'AVAILABLE'
                      ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md shadow-emerald-500/20'
                      : st === 'BUSY'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20'
                      : st === 'SLEEPING'
                      ? 'bg-indigo-500 text-white font-extrabold shadow-md shadow-indigo-500/20'
                      : 'bg-rose-500 text-white font-extrabold shadow-md shadow-rose-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Seller Room & Contact Location Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Mess Location: <strong className="text-white font-bold">{shopSettings?.roomNumber || "Room 101 (Men's Hostel)"}</strong>
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span>
            Contact: <strong className="text-white font-bold">{shopSettings?.emergencyContact || "+919876543210"}</strong>
          </span>
        </div>
        <button
          onClick={() => setIsEditingSeller(!isEditingSeller)}
          className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-800 text-amber-400 hover:bg-slate-750 border border-amber-500/30 transition-all shadow-sm"
        >
          {isEditingSeller ? 'Cancel' : 'Edit Room & Contact'}
        </button>
      </div>

      {isEditingSeller && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-3 animate-in fade-in">
          <div>
            <h4 className="font-bold text-xs text-white">Update Mess Room & Contact Phone</h4>
            <p className="text-[11px] text-slate-400">Updates will be broadcasted live to all student devices instantly.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Hostel Room Number / Building</label>
              <input
                type="text"
                value={sellerRoom}
                onChange={e => setSellerRoom(e.target.value)}
                placeholder="e.g. Room 101 (Men's Hostel)"
                className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Emergency Phone / WhatsApp</label>
              <input
                type="text"
                value={sellerPhone}
                onChange={e => setSellerPhone(e.target.value)}
                placeholder="e.g. +919876543210"
                className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">UPI ID for Payments</label>
              <input
                type="text"
                value={sellerUpiId}
                onChange={e => setSellerUpiId(e.target.value)}
                placeholder="e.g. anikumaricmani-1@okicici"
                className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Payee Name on UPI Bank Account</label>
              <input
                type="text"
                value={sellerUpiName}
                onChange={e => setSellerUpiName(e.target.value)}
                placeholder="e.g. Karthik C Mani"
                className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setIsEditingSeller(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSellerInfo}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-md"
            >
              Save & Broadcast Live
            </button>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Today's Orders</span>
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">{metrics?.todayOrdersCount || 0}</p>
          <p className="text-[10px] text-slate-500">
            {metrics?.completedOrdersCount || 0} completed • {metrics?.rejectedOrdersCount || 0} rejected
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Today's Sales</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">
            {formatINR(metrics?.todaySalesPaise || 0)}
          </p>
          <p className="text-[10px] text-slate-500">Realized revenue</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Outstanding Dues</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">
            {formatINR(metrics?.totalOutstandingDuesPaise || 0)}
          </p>
          <p className="text-[10px] text-slate-500">Credit owed by students</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Online Students</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-indigo-400">{onlinePresence.length}</p>
          <p className="text-[10px] text-slate-500">Active real-time sessions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'orders', label: `Active Orders (${activeOrders.length})`, icon: ShoppingBag },
          { key: 'presence', label: `Live Presence (${onlinePresence.length})`, icon: Users },
          { key: 'menu', label: 'Inventory & Prices', icon: Coffee },
          { key: 'credit', label: 'Student Credit Ledger', icon: TrendingUp },
          { key: 'announcements', label: 'Announcements', icon: MessageSquare }
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Orders Feed */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-200">Active Kitchen Orders</h3>
            <button
              onClick={loadAll}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-slate-850/50 border border-slate-800">
              <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-semibold">No active orders right now.</p>
              <p className="text-[11px] text-slate-500">Incoming student orders will chime automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeOrders.map(order => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3"
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
                      <p className="text-xs font-bold text-slate-200 mt-1">
                        Room: <span className="text-amber-400">{order.deliveryRoom}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Placed by {order.customerProfile?.fullName || 'Student'} • {order.customerProfile?.phoneNumber || 'No phone'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-base text-amber-400">
                        {formatINR(order.totalPaise)}
                      </span>
                      <p className="text-[10px] font-bold text-slate-400">
                        {order.paymentMethod} •{' '}
                        <span className={order.paymentStatus === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400'}>
                          {order.paymentStatus}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs space-y-1">
                    {order.items?.map(it => (
                      <div key={it.id} className="flex justify-between">
                        <span className="font-semibold text-slate-200">
                          {it.quantity}x {it.productName}
                        </span>
                        <span className="text-slate-400">{formatINR(it.subtotalPaise)}</span>
                      </div>
                    ))}
                    {order.specialInstructions && (
                      <p className="text-[11px] text-amber-300/90 pt-1 italic border-t border-slate-800">
                        Note: "{order.specialInstructions}"
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {order.status === 'PLACED' && (
                      <>
                        <button
                          onClick={() => handleOrderStatus(order.id, 'ACCEPTED')}
                          className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
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
                          className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30"
                        >
                          Alternative
                        </button>
                        <button
                          onClick={() => setRejectingOrderId(order.id)}
                          className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-xs border border-rose-500/30"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {order.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleOrderStatus(order.id, 'PREPARING')}
                        className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                      >
                        Start Cooking (Preparing)
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => handleOrderStatus(order.id, 'OUT_FOR_DELIVERY')}
                        className="flex-1 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs"
                      >
                        Out for Delivery →
                      </button>
                    )}

                    {order.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        onClick={() => handleOrderStatus(order.id, 'DELIVERED')}
                        className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                      >
                        Mark Delivered ✓
                      </button>
                    )}

                    {order.paymentStatus === 'PENDING' && (
                      <button
                        onClick={() => handleVerifyPayment(order)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold text-xs border border-slate-700"
                        title="Mark payment verified"
                      >
                        Verify Payment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Live Presence */}
      {activeTab === 'presence' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-200">Online Students Roster</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{onlinePresence.length} connected</span>
              <button
                onClick={() => refreshPresence()}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Refresh presence roster"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {onlinePresence.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-slate-850/50 border border-slate-800">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No students currently browsing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-850">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Room</th>
                    <th className="p-3">Current Activity</th>
                    <th className="p-3">Last Ping</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {onlinePresence.map(p => {
                    const isGuest = p.isGuest || p.userId.startsWith('guest_');
                    const rawTime = p.lastHeartbeat || (p as any).lastSeen || (p as any).lastPing;
                    let formattedTime = 'Active now';
                    if (rawTime) {
                      const d = new Date(typeof rawTime === 'string' && !rawTime.includes('T') ? rawTime.replace(' ', 'T') + 'Z' : rawTime);
                      if (!isNaN(d.getTime())) {
                        formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      }
                    }

                    return (
                      <tr key={p.userId} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isGuest ? 'bg-amber-400' : 'bg-emerald-500'} animate-pulse`} />
                          {isGuest ? (
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-200">Guest Visitor</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-amber-500/30">Browsing</span>
                            </span>
                          ) : (
                            <span className="text-white">{p.name || 'Student'}</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isGuest ? (
                            <span className="text-slate-500 italic text-[11px]">Unauthenticated</span>
                          ) : (
                            <span className="text-slate-300 font-semibold">{p.roomNumber || 'Room ?'}</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-amber-400">{p.activity}</td>
                        <td className="p-3 text-slate-400">{formattedTime}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Menu & Inventory */}
      {activeTab === 'menu' && (
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-slate-200">Catalog & Real-time Stock</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {products.map(p => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-xs text-white">{p.name}</h4>
                  <p className="text-xs font-extrabold text-amber-400">{formatINR(p.pricePaise)}</p>
                  <p className="text-[10px] text-slate-500">{p.categoryId}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStock(p.id, p.stockStatus)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      p.stockStatus === 'IN_STOCK'
                        ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-950/80 border-rose-500/30 text-rose-400'
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

      {/* Tab 4: Student Credit Management */}
      {activeTab === 'credit' && (
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-slate-200">Student Credit Roster</h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-850">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Room</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Unpaid Dues</th>
                  <th className="p-3">Balance Owed</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {customers.map(c => (
                  <tr key={c.userId} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold">{c.fullName}</td>
                    <td className="p-3 text-slate-300">{c.roomNumber}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        c.creditStatus === 'APPROVED'
                          ? 'bg-emerald-950 border-emerald-500/30 text-emerald-400'
                          : c.creditStatus === 'REQUESTED'
                          ? 'bg-amber-950 border-amber-500/30 text-amber-400 animate-pulse'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        {c.creditStatus}
                      </span>
                    </td>
                    <td className="p-3 font-bold">
                      <span className={c.unpaidOrdersCount > 2 ? 'text-rose-400' : 'text-slate-300'}>
                        {c.unpaidOrdersCount} / 2
                      </span>
                    </td>
                    <td className="p-3 font-black text-amber-400">
                      {formatINR(c.outstandingBalancePaise)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {c.creditStatus === 'REQUESTED' && (
                          <button
                            onClick={() => handleSetCreditStatus(c.userId, 'APPROVED')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[10px]"
                          >
                            Approve
                          </button>
                        )}
                        {c.creditStatus === 'APPROVED' && (
                          <button
                            onClick={() => handleSetCreditStatus(c.userId, 'REVOKED')}
                            className="px-2 py-1 rounded-lg bg-rose-950 border border-rose-500/30 text-rose-400 font-bold text-[10px]"
                          >
                            Revoke
                          </button>
                        )}
                        {c.outstandingBalancePaise > 0 && (
                          <button
                            onClick={() => setSettlingCustomer(c)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-[10px] border border-slate-700"
                          >
                            Settle Cash
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

      {/* Tab 5: Announcements */}
      {activeTab === 'announcements' && (
        <div className="max-w-md mx-auto space-y-4">
          <h3 className="font-bold text-sm text-slate-200">Broadcast Announcement</h3>
          <form onSubmit={handleCreateAnnouncement} className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
            <input
              type="text"
              required
              placeholder="Title (e.g. Fresh Bananas Available Tonight)"
              value={newAnnTitle}
              onChange={e => setNewAnnTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <textarea
              required
              rows={3}
              placeholder="Message description..."
              value={newAnnMessage}
              onChange={e => setNewAnnMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Broadcast to Students
            </button>
          </form>
        </div>
      )}

      {/* Reject Reason Dialog */}
      {rejectingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-4 space-y-3">
            <h4 className="font-bold text-sm text-white">Reject Order</h4>
            <input
              type="text"
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectingOrderId(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleOrderStatus(rejectingOrderId, 'REJECTED', rejectionReason);
                  setRejectingOrderId(null);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggest Alternative Dialog */}
      {altOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form onSubmit={handleSuggestAlternative} className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-4 space-y-3">
            <h4 className="font-bold text-sm text-white">Suggest Alternative Product</h4>
            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 font-bold">Select Replacement Item:</label>
              <select
                value={altSuggestedProdId}
                onChange={e => setAltSuggestedProdId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Choose substitute item --</option>
                {products.filter(p => p.stockStatus === 'IN_STOCK').map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatINR(p.pricePaise)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-bold">Admin Note to Student:</label>
              <input
                type="text"
                value={altNote}
                onChange={e => setAltNote(e.target.value)}
                placeholder="e.g. Boost is finished, would you like Horlicks instead?"
                className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAltOrderId(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
              >
                Send Proposal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Settle Cash Dues Dialog */}
      {settlingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form onSubmit={handleSettleDues} className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-4 space-y-3">
            <h4 className="font-bold text-sm text-white">Record Cash Settlement</h4>
            <p className="text-xs text-slate-400">
              Student: <strong className="text-white">{settlingCustomer.fullName}</strong> ({settlingCustomer.roomNumber})
            </p>
            <p className="text-xs text-amber-400 font-bold">
              Total Owed: {formatINR(settlingCustomer.outstandingBalancePaise)}
            </p>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">Amount Paid in Rupees (₹):</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 50"
                value={settleAmountRupees}
                onChange={e => setSettleAmountRupees(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">Description:</label>
              <input
                type="text"
                value={settleDescription}
                onChange={e => setSettleDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettlingCustomer(null)}
                className="flex-1 py-2 rounded-xl bg-slate-850 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                Record Payment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
