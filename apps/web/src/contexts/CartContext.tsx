import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '../types/index.js';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, selectedOptions?: Record<string, string>) => void;
  removeItem: (productId: string, selectedOptions?: Record<string, string>) => void;
  updateQuantity: (productId: string, quantity: number, selectedOptions?: Record<string, string>) => void;
  clearCart: () => void;
  itemCount: number;
  subtotalPaise: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const matchOptions = (a?: Record<string, string>, b?: Record<string, string>): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => a[k] === b[k]);
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('roombites_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('roombites_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, quantity = 1, selectedOptions?: Record<string, string>) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(
        it => it.product.id === product.id && matchOptions(it.selectedOptions, selectedOptions)
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          subtotalPaise: newQty * product.pricePaise
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity,
            selectedOptions,
            subtotalPaise: quantity * product.pricePaise
          }
        ];
      }
    });
  };

  const removeItem = (productId: string, selectedOptions?: Record<string, string>) => {
    setItems(prev => prev.filter(it => !(it.product.id === productId && matchOptions(it.selectedOptions, selectedOptions))));
  };

  const updateQuantity = (productId: string, quantity: number, selectedOptions?: Record<string, string>) => {
    if (quantity <= 0) {
      removeItem(productId, selectedOptions);
      return;
    }
    setItems(prev =>
      prev.map(it => {
        if (it.product.id === productId && matchOptions(it.selectedOptions, selectedOptions)) {
          return {
            ...it,
            quantity,
            subtotalPaise: quantity * it.product.pricePaise
          };
        }
        return it;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const subtotalPaise = items.reduce((sum, it) => sum + it.subtotalPaise, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotalPaise,
        isCartOpen,
        setIsCartOpen
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
