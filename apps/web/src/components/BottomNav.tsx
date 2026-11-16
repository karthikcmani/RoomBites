import React from 'react';
import { UtensilsCrossed, ShoppingBag, CreditCard, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';
import { useCart } from '../contexts/CartContext.js';

export type NavTab = 'menu' | 'orders' | 'credit' | 'profile' | 'admin';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAuth: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenAuth
}) => {
  const { user } = useAuth();
  const { itemCount } = useCart();

  const handleTabClick = (tab: NavTab) => {
    if (tab === 'profile' && !user) {
      onOpenAuth();
      return;
    }
    onSelectTab(tab);
  };

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 dark:bg-surface/95 backdrop-blur-lg border-t border-border-subtle transition-colors"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.35rem)'
      }}
    >
      <div className={`max-w-md mx-auto grid ${user?.role === 'ADMIN' ? 'grid-cols-5' : 'grid-cols-4'} h-14 items-center px-1`}>
        {/* Tab 1: Menu */}
        <button
          onClick={() => handleTabClick('menu')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-all active:scale-95 ${
            currentTab === 'menu'
              ? 'text-accent font-bold'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4 stroke-[2.2]" />
          <span className="text-[10px] tracking-tight">Menu</span>
        </button>

        {/* Tab 2: Orders */}
        <button
          onClick={() => handleTabClick('orders')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-all active:scale-95 ${
            currentTab === 'orders'
              ? 'text-accent font-bold'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
          <span className="text-[10px] tracking-tight">Orders</span>
        </button>

        {/* Tab 3: Credit */}
        <button
          onClick={() => handleTabClick('credit')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-all active:scale-95 ${
            currentTab === 'credit'
              ? 'text-accent font-bold'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <CreditCard className="w-4 h-4 stroke-[2.2]" />
          <span className="text-[10px] tracking-tight">Credit</span>
        </button>

        {/* Tab 4: Profile / Auth */}
        <button
          onClick={() => handleTabClick('profile')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-all active:scale-95 ${
            currentTab === 'profile'
              ? 'text-accent font-bold'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <User className="w-4 h-4 stroke-[2.2]" />
          <span className="text-[10px] tracking-tight">
            {user ? 'Account' : 'Sign In'}
          </span>
        </button>

        {/* Tab 5 (Admin Only) */}
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => handleTabClick('admin')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-all active:scale-95 ${
              currentTab === 'admin'
                ? 'text-accent font-bold'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            <span className="text-[10px] tracking-tight">Admin</span>
          </button>
        )}
      </div>
    </nav>
  );
};
