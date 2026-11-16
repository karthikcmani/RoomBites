import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import { CartProvider } from './contexts/CartContext.js';
import { RealtimeProvider, useRealtime } from './contexts/RealtimeContext.js';
import { ThemeProvider } from './contexts/ThemeContext.js';
import { Navbar } from './components/Navbar.js';
import { BottomNav, NavTab } from './components/BottomNav.js';
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

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { activeAlerts, dismissAlert } = useRealtime();

  const [currentTab, setCurrentTab] = useState<NavTab>('menu');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreditOpen, setIsCreditOpen] = useState(false);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);

  const handleOrderPlaced = (newOrder: Order) => {
    setActiveTrackingOrder(newOrder);
  };

  const handleTabSelect = (tab: NavTab) => {
    if (tab === 'credit') {
      setIsCreditOpen(true);
      return;
    }
    if (tab === 'profile') {
      setIsAuthOpen(true);
      return;
    }
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen bg-canvas text-text-main flex flex-col font-sans selection:bg-accent selection:text-slate-950 transition-colors duration-200">
      {/* Toast Alert Banners */}
      <div
        className="fixed right-4 left-4 sm:left-auto sm:max-w-sm z-50 space-y-2 pointer-events-none"
        style={{
          top: 'calc(max(env(safe-area-inset-top, 0px), 0px) + 3.75rem)'
        }}
      >
        {activeAlerts.map(alert => (
          <div
            key={alert.id}
            className="pointer-events-auto p-3 rounded-xl bg-surface-elevated/95 border border-accent/30 shadow-lg backdrop-blur-md flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-200"
          >
            <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-semibold text-xs text-text-main">{alert.title}</h5>
              <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">{alert.message}</p>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="text-text-muted hover:text-text-main p-1 transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Minimal Navbar */}
      <Navbar
        currentTab={currentTab}
        onNavigate={handleTabSelect}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main View Router */}
      <main
        className="flex-1"
        style={{
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 0px) + 5rem)'
        }}
      >
        {currentTab === 'menu' && <CustomerHome />}
        {currentTab === 'orders' && (
          <OrderHistoryPage
            onSelectOrder={order => setActiveTrackingOrder(order)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}
        {currentTab === 'admin' && (
          user?.role === 'ADMIN' ? (
            <AdminDashboard />
          ) : (
            <div className="max-w-md mx-auto py-16 px-4 text-center space-y-2">
              <p className="font-semibold text-sm text-rose-500">Restricted Access</p>
              <p className="text-xs text-text-muted">Only the authorized mess admin can access this command center.</p>
            </div>
          )
        )}
      </main>

      {/* Persistent Floating Cart Pill (Menu view only) */}
      {currentTab === 'menu' && <FloatingCartBar />}

      {/* Mobile-first Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={handleTabSelect}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

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
        onClose={() => {
          setIsCreditOpen(false);
        }}
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
