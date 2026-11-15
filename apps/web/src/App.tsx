import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import { CartProvider } from './contexts/CartContext.js';
import { RealtimeProvider, useRealtime } from './contexts/RealtimeContext.js';
import { Navbar } from './components/Navbar.js';
import { FloatingCartBar } from './components/FloatingCartBar.js';
import { CartSheet } from './components/CartSheet.js';
import { OrderTrackerModal } from './components/OrderTrackerModal.js';
import { AuthModal } from './components/AuthModal.js';
import { CreditModal } from './components/CreditModal.js';
import { CustomerHome } from './pages/CustomerHome.js';
import { OrderHistoryPage } from './pages/OrderHistoryPage.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { Order } from './types/index.js';
import { Bell, X } from 'lucide-react';

import { ThemeProvider } from './contexts/ThemeContext.js';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { activeAlerts, dismissAlert } = useRealtime();

  const [currentView, setCurrentView] = useState<'menu' | 'orders' | 'admin'>('menu');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreditOpen, setIsCreditOpen] = useState(false);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);

  const handleOrderPlaced = (newOrder: Order) => {
    setActiveTrackingOrder(newOrder);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Alert Banners */}
      <div
        className="fixed right-4 z-50 space-y-2 pointer-events-none max-w-sm w-full"
        style={{
          top: 'calc(max(env(safe-area-inset-top, 0px), var(--app-safe-top, 0px)) + 4.25rem)'
        }}
      >
        {activeAlerts.map(alert => (
          <div
            key={alert.id}
            className="pointer-events-auto p-3.5 rounded-2xl bg-slate-850/95 border border-amber-500/40 shadow-2xl backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-top-4 duration-300"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-bold text-xs text-white">{alert.title}</h5>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">{alert.message}</p>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenCredit={() => setIsCreditOpen(true)}
      />

      {/* Main View Router */}
      <main
        className="flex-1"
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), var(--app-safe-top, 0px)) + 4.25rem)'
        }}
      >
        {currentView === 'menu' && <CustomerHome />}
        {currentView === 'orders' && (
          <OrderHistoryPage
            onSelectOrder={order => setActiveTrackingOrder(order)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}
        {currentView === 'admin' && (
          user?.role === 'ADMIN' ? (
            <AdminDashboard />
          ) : (
            <div className="max-w-md mx-auto py-16 text-center space-y-2">
              <p className="font-bold text-sm text-rose-400">Restricted Access</p>
              <p className="text-xs text-slate-400">Only the authorized hostel mess admin can view this dashboard.</p>
            </div>
          )
        )}
      </main>

      {/* Persistent Floating Cart Bar (Customer Menu View) */}
      {currentView === 'menu' && <FloatingCartBar />}

      {/* Modals & Slide-out Drawers */}
      <CartSheet
        onOrderPlaced={handleOrderPlaced}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenCredit={() => setIsCreditOpen(true)}
      />

      <OrderTrackerModal
        order={activeTrackingOrder}
        isOpen={Boolean(activeTrackingOrder)}
        onClose={() => setActiveTrackingOrder(null)}
        onOrderUpdated={updated => setActiveTrackingOrder(updated)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <CreditModal
        isOpen={isCreditOpen}
        onClose={() => setIsCreditOpen(false)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <RealtimeProvider>
            <AppContent />
          </RealtimeProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
