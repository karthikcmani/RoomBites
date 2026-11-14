import {
  User,
  CustomerProfile,
  Category,
  Product,
  Order,
  OrderAlternative,
  ShopSetting,
  Announcement,
  CreditLedgerEntry,
  CustomerPresence,
  PaymentMethod,
  OrderStatus,
  StockStatus
} from '../types/index.js';
import { getApiBaseUrl, getServerBaseUrl } from '../config/apiConfig.js';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('roombites_token');
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('roombites_token', token);
    } else {
      localStorage.removeItem('roombites_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const apiBase = getApiBaseUrl();
    const fullUrl = `${apiBase}${endpoint}`;

    let response: Response;
    try {
      response = await fetch(fullUrl, {
        ...options,
        headers
      });
    } catch (networkErr: any) {
      const server = getServerBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '');
      throw new Error(
        `Unable to reach RoomBites backend at '${server}'. Ensure the backend is running and your device is connected to the same network.`
      );
    }

    // Inspect Content-Type before attempting JSON parsing
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Server returned error (${response.status}): ${text.slice(0, 150)}`);
      }
      throw new Error(
        `Backend at '${apiBase}' returned non-JSON response (${contentType || 'unknown'}). Please verify that the server URL points to the RoomBites API and not a static web server.`
      );
    }

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  // --- Auth Endpoints ---
  public auth = {
    requestOtp: (email: string) =>
      this.request<{ success: boolean; message: string }>('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),

    verifyOtp: async (email: string, code: string) => {
      const res = await this.request<{
        success: boolean;
        token: string;
        user: User & { profile?: CustomerProfile };
      }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, code })
      });
      this.setToken(res.token);
      return res;
    },

    getProfile: () =>
      this.request<{ success: boolean; profile: CustomerProfile | null }>('/auth/profile'),

    updateProfile: (data: { fullName: string; roomNumber: string; phoneNumber: string }) =>
      this.request<{ success: boolean; profile: CustomerProfile }>('/auth/profile', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  };

  // --- Product Endpoints ---
  public products = {
    getCategories: () =>
      this.request<{ success: boolean; categories: Category[] }>('/products/categories'),

    getProducts: (categoryId?: string) =>
      this.request<{ success: boolean; products: Product[] }>(
        categoryId ? `/products?category=${categoryId}` : '/products'
      ),

    getAllAdmin: () =>
      this.request<{ success: boolean; products: Product[] }>('/products/admin/all'),

    create: (data: any) =>
      this.request<{ success: boolean; product: Product }>('/products', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    update: (id: string, data: Partial<Product>) =>
      this.request<{ success: boolean; product: Product }>(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    toggleAvailability: (id: string, isAvailable: boolean) =>
      this.request<{ success: boolean; product: Product }>(`/products/${id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable })
      }),

    updateStock: (id: string, stockStatus: StockStatus) =>
      this.request<{ success: boolean; product: Product }>(`/products/${id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ stockStatus })
      })
  };

  // --- Order Endpoints ---
  public orders = {
    place: (data: {
      deliveryRoom: string;
      specialInstructions?: string;
      paymentMethod: PaymentMethod;
      isScheduled?: boolean;
      scheduledFor?: string;
      items: Array<{ productId: string; quantity: number; selectedOptions?: Record<string, string> }>;
    }) =>
      this.request<{ success: boolean; order: Order }>('/orders', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getMyOrders: () =>
      this.request<{ success: boolean; orders: Order[] }>('/orders/my-orders'),

    getById: (id: string) =>
      this.request<{ success: boolean; order: Order }>(`/orders/${id}`),

    cancel: (id: string, reason?: string) =>
      this.request<{ success: boolean; order: Order }>(`/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      }),

    respondAlternative: (id: string, action: 'ACCEPT' | 'REJECT') =>
      this.request<{ success: boolean; order: Order }>(`/orders/${id}/respond-alternative`, {
        method: 'POST',
        body: JSON.stringify({ action })
      }),

    getAdminFeed: (filter?: string) =>
      this.request<{ success: boolean; orders: Order[] }>(
        filter ? `/orders/admin/feed?filter=${filter}` : '/orders/admin/feed'
      ),

    updateStatusAdmin: (id: string, status: OrderStatus, rejectionReason?: string) =>
      this.request<{ success: boolean; order: Order }>(`/orders/admin/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, rejectionReason })
      }),

    suggestAlternativeAdmin: (id: string, data: { originalProductId: string; suggestedProductId: string; note?: string }) =>
      this.request<{ success: boolean; alternative: OrderAlternative }>(`/orders/admin/${id}/suggest-alternative`, {
        method: 'POST',
        body: JSON.stringify(data)
      })
  };

  // --- Payment & Credit Endpoints ---
  public payments = {
    requestCredit: () =>
      this.request<{ success: boolean; profile: CustomerProfile }>('/payments/credit/request', {
        method: 'POST'
      }),

    getMyCreditLedger: () =>
      this.request<{ success: boolean; ledger: CreditLedgerEntry[] }>('/payments/credit/ledger'),

    verifyPaymentAdmin: (data: { orderId: string; paymentMethod: PaymentMethod; transactionRef?: string; amountPaise: number }) =>
      this.request<{ success: boolean; payment: any }>('/payments/admin/verify', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    setCreditStatusAdmin: (userId: string, status: 'APPROVED' | 'REVOKED' | 'DISABLED') =>
      this.request<{ success: boolean; profile: CustomerProfile }>(`/payments/admin/credit/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      }),

    settleDuesAdmin: (userId: string, amountPaise: number, description?: string) =>
      this.request<{ success: boolean; profile: CustomerProfile; ledgerEntry: CreditLedgerEntry }>(
        `/payments/admin/credit/${userId}/settle`,
        {
          method: 'POST',
          body: JSON.stringify({ amountPaise, description })
        }
      ),

    getCustomersAdmin: () =>
      this.request<{ success: boolean; customers: CustomerProfile[] }>('/payments/admin/customers')
  };

  // --- Shop Settings, Announcements & Analytics ---
  public shop = {
    getSettings: () =>
      this.request<{ success: boolean; settings: ShopSetting }>('/shop/settings'),

    updateSettings: (data: Partial<ShopSetting>) =>
      this.request<{ success: boolean; settings: ShopSetting }>('/shop/settings', {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    getAnnouncements: () =>
      this.request<{ success: boolean; announcements: Announcement[] }>('/shop/announcements'),

    createAnnouncement: (data: { title: string; message: string; badgeType?: string; expiresAt?: string }) =>
      this.request<{ success: boolean; announcement: Announcement }>('/shop/announcements', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    deleteAnnouncement: (id: string) =>
      this.request<{ success: boolean; message: string }>(`/shop/announcements/${id}`, {
        method: 'DELETE'
      }),

    getDashboardMetrics: () =>
      this.request<{ success: boolean; metrics: any }>('/shop/admin/analytics'),

    getOnlinePresence: () =>
      this.request<{ success: boolean; presence: CustomerPresence[] }>('/shop/admin/presence')
  };
}

export const api = new ApiClient();
