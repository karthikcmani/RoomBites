import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext.js';
import { ShopSetting, Announcement, CustomerPresence } from '../types/index.js';
import { api } from '../services/api.js';
import { soundManager } from '../utils/sound.js';
import { getWebSocketUrl } from '../config/apiConfig.js';

interface ToastAlert {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'status' | 'info';
  timestamp: Date;
}

interface RealtimeContextType {
  isConnected: boolean;
  shopSettings: ShopSetting | null;
  announcements: Announcement[];
  onlinePresence: CustomerPresence[];
  activeAlerts: ToastAlert[];
  dismissAlert: (id: string) => void;
  sendActivity: (activity: string, page?: string) => void;
  refreshSettings: () => Promise<void>;
  refreshAnnouncements: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [shopSettings, setShopSettings] = useState<ShopSetting | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [onlinePresence, setOnlinePresence] = useState<CustomerPresence[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ToastAlert[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatTimerRef = useRef<any>(null);
  const reconnectTimerRef = useRef<any>(null);

  const addAlert = (title: string, message: string, type: 'order' | 'status' | 'info') => {
    const alert: ToastAlert = {
      id: Math.random().toString(),
      title,
      message,
      type,
      timestamp: new Date()
    };
    setActiveAlerts(prev => [alert, ...prev.slice(0, 4)]);
    setTimeout(() => {
      dismissAlert(alert.id);
    }, 6000);
  };

  const dismissAlert = (id: string) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== id));
  };

  const refreshSettings = async () => {
    try {
      const res = await api.shop.getSettings();
      setShopSettings(res.settings);
    } catch (err) {
      console.error('Error fetching shop settings:', err);
    }
  };

  const refreshAnnouncements = async () => {
    try {
      const res = await api.shop.getAnnouncements();
      setAnnouncements(res.announcements);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    }
  };

  const sendActivity = (activity: string, page?: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'HEARTBEAT',
        payload: { activity, page }
      }));
    }
  };

  // Initial fetch
  useEffect(() => {
    refreshSettings();
    refreshAnnouncements();
  }, []);

  // WebSocket Connection Lifecycle
  useEffect(() => {
    const connectWs = () => {
      if (socketRef.current) {
        socketRef.current.close();
      }

      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        if (token) {
          ws.send(JSON.stringify({
            type: 'AUTH',
            payload: { token }
          }));
        }

        // Start heartbeat
        if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'HEARTBEAT',
              payload: { activity: 'browsing_menu' }
            }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'ORDER_CREATED':
              soundManager.playOrderChime();
              addAlert(
                'New Incoming Order!',
                `Order #${msg.payload.orderNumber} placed from ${msg.payload.roomNumber}`,
                'order'
              );
              break;

            case 'ORDER_STATUS_CHANGED':
              soundManager.playStatusChime();
              addAlert(
                'Order Status Updated',
                `Order #${msg.payload.orderNumber} is now ${msg.payload.status}`,
                'status'
              );
              break;

            case 'ALTERNATIVE_SUGGESTED':
              soundManager.playStatusChime();
              addAlert(
                'Alternative Item Suggested',
                `${msg.payload.suggestedProductName} proposed by admin`,
                'info'
              );
              break;

            case 'SHOP_STATUS_CHANGED':
              setShopSettings(prev => prev ? { ...prev, status: msg.payload.status, statusNote: msg.payload.statusNote } : null);
              addAlert(
                'Kitchen Status Changed',
                `Store is now ${msg.payload.status.toLowerCase()}`,
                'info'
              );
              break;

            case 'PRESENCE_UPDATE':
              if (user?.role === 'ADMIN') {
                setOnlinePresence(prev => {
                  const filtered = prev.filter(p => p.userId !== msg.payload.userId);
                  if (msg.payload.status === 'offline') return filtered;
                  return [msg.payload, ...filtered];
                });
              }
              break;

            case 'NEW_ANNOUNCEMENT':
              setAnnouncements(prev => [msg.payload, ...prev]);
              break;
          }
        } catch (err) {
          console.error('Error handling WS frame:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
        // Exponential reconnect attempt
        reconnectTimerRef.current = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWs();

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [token, user]);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        shopSettings,
        announcements,
        onlinePresence,
        activeAlerts,
        dismissAlert,
        sendActivity,
        refreshSettings,
        refreshAnnouncements
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used within a RealtimeProvider');
  return context;
};
