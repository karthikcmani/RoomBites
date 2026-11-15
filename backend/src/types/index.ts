export type UserRole = 'CUSTOMER' | 'ADMIN';

export type CreditStatus = 'DISABLED' | 'REQUESTED' | 'APPROVED' | 'REVOKED';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type ShopStatus = 'AVAILABLE' | 'BUSY' | 'CLOSED' | 'SLEEPING';

export type OrderStatus =
  | 'PLACED'
  | 'AWAITING_APPROVAL'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'UPI' | 'CREDIT';

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REFUNDED';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  userId: string;
  fullName: string;
  roomNumber: string;
  phoneNumber: string;
  creditStatus: CreditStatus;
  unpaidOrdersCount: number;
  outstandingBalancePaise: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ProductCustomizationOptions {
  sugar?: string[];
  strength?: string[];
  spice?: string[];
  [key: string]: string[] | undefined;
}

export interface Product {
  id: string;
  sellerId: string;
  categoryId: string;
  name: string;
  description: string;
  pricePaise: number;
  imageUrl?: string;
  stockStatus: StockStatus;
  isAvailable: boolean;
  hasCustomization: boolean;
  customizationSchema?: ProductCustomizationOptions;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unitPricePaise: number;
  quantity: number;
  subtotalPaise: number;
  selectedOptions?: Record<string, string>;
}

export interface OrderAlternative {
  id: string;
  orderId: string;
  originalProductId: string;
  originalProductName: string;
  suggestedProductId: string;
  suggestedProductName: string;
  priceDifferencePaise: number;
  adminNote?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  resolvedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  sellerId: string;
  status: OrderStatus;
  deliveryRoom: string;
  specialInstructions?: string;
  isScheduled: boolean;
  scheduledFor?: string;
  subtotalPaise: number;
  deliveryFeePaise: number;
  discountPaise: number;
  totalPaise: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cancellationReason?: string;
  estimatedDeliveryTime?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  alternative?: OrderAlternative;
  customerProfile?: CustomerProfile;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  customerId: string;
  paymentMethod: PaymentMethod;
  amountPaise: number;
  status: PaymentStatus;
  transactionRef?: string;
  verifiedByUserId?: string;
  verifiedAt?: string;
  refundReason?: string;
  createdAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  customerId: string;
  orderId?: string;
  entryType: 'DEBIT' | 'CREDIT';
  amountPaise: number;
  balanceAfterPaise: number;
  description: string;
  recordedBy: string;
  createdAt: string;
}

export interface CustomerPresence {
  userId: string;
  name?: string;
  roomNumber?: string;
  isOnline: boolean;
  activity: string;
  currentPage?: string;
  lastHeartbeat: string;
  disconnectedAt?: string;
}

export interface ShopSetting {
  id: string;
  sellerId: string;
  status: ShopStatus;
  statusNote?: string;
  openingTimeIST: string;
  closingTimeIST: string;
  autoScheduleEnabled: boolean;
  emergencyContact?: string;
  roomNumber?: string;
  shopName?: string;
  upiId?: string;
  upiName?: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  sellerId: string;
  title: string;
  message: string;
  badgeType: 'INFO' | 'ALERT' | 'SPECIAL';
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}
