import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { Order, OrderItem, OrderAlternative, OrderStatus, PaymentMethod } from '../types/index.js';
import { WebSocketBroker } from '../websocket/server.js';

export class OrderService {
  private db = getDb();

  public getOrdersForCustomer(customerId: string): Order[] {
    const orders = this.db.prepare(`
      SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC
    `).all(customerId) as any[];

    return orders.map(o => this.hydrateOrder(o));
  }

  public getOrdersAdmin(statusFilter?: string): Order[] {
    let sql = 'SELECT * FROM orders';
    const params: any[] = [];

    if (statusFilter === 'ACTIVE') {
      sql += ' WHERE status IN ("PLACED", "AWAITING_APPROVAL", "ACCEPTED", "PAYMENT_PENDING", "PREPARING", "OUT_FOR_DELIVERY")';
    } else if (statusFilter === 'COMPLETED') {
      sql += ' WHERE status IN ("DELIVERED", "REJECTED", "CANCELLED")';
    } else if (statusFilter) {
      sql += ' WHERE status = ?';
      params.push(statusFilter);
    }

    sql += ' ORDER BY created_at DESC';
    const orders = this.db.prepare(sql).all(...params) as any[];
    return orders.map(o => this.hydrateOrder(o));
  }

  public getOrderById(orderId: string): Order | null {
    const order = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!order) return null;
    return this.hydrateOrder(order);
  }

  public createOrder(customerId: string, data: {
    deliveryRoom: string;
    specialInstructions?: string;
    paymentMethod: PaymentMethod;
    isScheduled?: boolean;
    scheduledFor?: string;
    items: Array<{
      productId: string;
      quantity: number;
      selectedOptions?: Record<string, string>;
    }>;
  }): Order {
    if (!data.items || data.items.length === 0) {
      throw new Error('EMPTY_CART: Your cart is empty. Please add items before placing an order.');
    }

    // 1. Verify Shop Availability
    const shopSetting = this.db.prepare('SELECT * FROM shop_settings WHERE seller_id = ?').get('seller_primary') as any;
    if (shopSetting) {
      if ((shopSetting.status === 'CLOSED' || shopSetting.status === 'SLEEPING') && !data.isScheduled) {
        throw new Error(`SHOP_${shopSetting.status}: The kitchen is currently ${shopSetting.status.toLowerCase()}. Emergency contact: ${shopSetting.emergency_contact || 'None'}`);
      }
    }

    // 2. Fetch and Validate Customer Profile
    const profile = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(customerId) as any;
    if (!profile) {
      throw new Error('PROFILE_REQUIRED: Please complete your profile (name & room number) before ordering.');
    }

    // 3. Strict Credit Check: Rule 15
    // "A customer with more than TWO outstanding unpaid dues must not be allowed to place another order."
    if (data.paymentMethod === 'CREDIT') {
      if (profile.credit_status !== 'APPROVED') {
        throw new Error('CREDIT_NOT_APPROVED: Your account is not approved to purchase on credit. Please request credit approval first.');
      }
      if (profile.unpaid_orders_count > 2) {
        throw new Error(`CREDIT_LIMIT_EXCEEDED: You have ${profile.unpaid_orders_count} unpaid orders. Students with more than 2 unpaid dues are blocked from credit purchases until payment is settled.`);
      }
    }

    // 4. Validate Items and Compute Authoritative Server-Side Prices
    let subtotalPaise = 0;
    const resolvedItems: Array<{
      productId: string;
      productName: string;
      unitPricePaise: number;
      quantity: number;
      subtotalPaise: number;
      selectedOptions?: Record<string, string>;
    }> = [];

    for (const item of data.items) {
      if (item.quantity <= 0) {
        throw new Error('INVALID_QUANTITY: Quantity must be greater than zero.');
      }

      const prod = this.db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId) as any;
      if (!prod || !prod.is_available) {
        throw new Error(`ITEM_UNAVAILABLE: "${prod?.name || item.productId}" is currently unavailable.`);
      }

      if (prod.stock_status === 'OUT_OF_STOCK') {
        throw new Error(`ITEM_OUT_OF_STOCK: "${prod.name}" is sold out tonight.`);
      }

      const itemSubtotal = prod.price_paise * item.quantity;
      subtotalPaise += itemSubtotal;

      resolvedItems.push({
        productId: prod.id,
        productName: prod.name,
        unitPricePaise: prod.price_paise,
        quantity: item.quantity,
        subtotalPaise: itemSubtotal,
        selectedOptions: item.selectedOptions
      });
    }

    const deliveryFeePaise = 0; // Free delivery in hostel
    const discountPaise = 0;
    const totalPaise = subtotalPaise + deliveryFeePaise - discountPaise;

    const orderId = 'ord_' + crypto.randomUUID().slice(0, 10);
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = (this.db.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at LIKE ?').get(`${new Date().toISOString().slice(0, 10)}%`) as any)?.count || 0;
    const orderNumber = `RB-${datePrefix}-${String(countToday + 1).padStart(3, '0')}`;

    const deliveryRoom = data.deliveryRoom?.trim() || profile.room_number;

    // 5. Atomic DB Insertion
    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.prepare(`
        INSERT INTO orders (
          id, order_number, customer_id, seller_id, status, delivery_room,
          special_instructions, is_scheduled, scheduled_for, subtotal_paise,
          delivery_fee_paise, discount_paise, total_paise, payment_method,
          payment_status
        ) VALUES (?, ?, ?, ?, 'PLACED', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(
        orderId,
        orderNumber,
        customerId,
        'seller_primary',
        deliveryRoom,
        data.specialInstructions?.trim() || null,
        data.isScheduled ? 1 : 0,
        data.scheduledFor || null,
        subtotalPaise,
        deliveryFeePaise,
        discountPaise,
        totalPaise,
        data.paymentMethod
      );

      for (const item of resolvedItems) {
        const itemId = 'item_' + crypto.randomUUID().slice(0, 10);
        this.db.prepare(`
          INSERT INTO order_items (
            id, order_id, product_id, product_name, unit_price_paise,
            quantity, subtotal_paise, selected_options
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          itemId,
          orderId,
          item.productId,
          item.productName,
          item.unitPricePaise,
          item.quantity,
          item.subtotalPaise,
          item.selectedOptions ? JSON.stringify(item.selectedOptions) : null
        );
      }

      // If Credit, update customer profile and record ledger entry
      if (data.paymentMethod === 'CREDIT') {
        const newUnpaidCount = profile.unpaid_orders_count + 1;
        const newBalance = profile.outstanding_balance_paise + totalPaise;

        this.db.prepare(`
          UPDATE customer_profiles
          SET unpaid_orders_count = ?, outstanding_balance_paise = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `).run(newUnpaidCount, newBalance, customerId);

        const ledgerId = 'ledg_' + crypto.randomUUID().slice(0, 10);
        this.db.prepare(`
          INSERT INTO credit_ledger (
            id, customer_id, order_id, entry_type, amount_paise,
            balance_after_paise, description, recorded_by
          ) VALUES (?, ?, ?, 'DEBIT', ?, ?, ?, ?)
        `).run(
          ledgerId,
          customerId,
          orderId,
          totalPaise,
          newBalance,
          `Credit Order #${orderNumber}`,
          customerId
        );
      }

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    const createdOrder = this.getOrderById(orderId)!;

    // Real-time broadcast to Admin
    WebSocketBroker.getInstance().broadcastToAdmins({
      type: 'ORDER_CREATED',
      payload: {
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        customerName: profile.full_name,
        roomNumber: deliveryRoom,
        totalPaise: createdOrder.totalPaise,
        paymentMethod: createdOrder.paymentMethod,
        itemsCount: resolvedItems.length,
        placedAt: createdOrder.createdAt
      }
    });

    return createdOrder;
  }

  public adminUpdateStatus(orderId: string, newStatus: OrderStatus, rejectionReason?: string): Order {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('NOT_FOUND: Order not found.');

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PLACED: ['ACCEPTED', 'REJECTED', 'AWAITING_APPROVAL'],
      AWAITING_APPROVAL: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
      ACCEPTED: ['PAYMENT_PENDING', 'PAID', 'PREPARING', 'CANCELLED'],
      PAYMENT_PENDING: ['PAID', 'PREPARING', 'CANCELLED'],
      PAID: ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'],
      PREPARING: ['OUT_FOR_DELIVERY', 'DELIVERED'],
      OUT_FOR_DELIVERY: ['DELIVERED'],
      DELIVERED: [],
      REJECTED: [],
      CANCELLED: []
    };

    if (!validTransitions[order.status]?.includes(newStatus)) {
      throw new Error(`INVALID_TRANSITION: Cannot transition order from ${order.status} to ${newStatus}.`);
    }

    // If rejecting an order that was on credit, reverse the credit debit
    if (newStatus === 'REJECTED' && order.paymentMethod === 'CREDIT') {
      const profile = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(order.customerId) as any;
      if (profile) {
        const newUnpaid = Math.max(0, profile.unpaid_orders_count - 1);
        const newBal = Math.max(0, profile.outstanding_balance_paise - order.totalPaise);
        this.db.prepare(`
          UPDATE customer_profiles
          SET unpaid_orders_count = ?, outstanding_balance_paise = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `).run(newUnpaid, newBal, order.customerId);

        const ledgerId = 'ledg_' + crypto.randomUUID().slice(0, 10);
        this.db.prepare(`
          INSERT INTO credit_ledger (id, customer_id, order_id, entry_type, amount_paise, balance_after_paise, description, recorded_by)
          VALUES (?, ?, ?, 'CREDIT', ?, ?, 'Reversal for Rejected Order', 'admin')
        `).run(ledgerId, order.customerId, order.id, order.totalPaise, newBal);
      }
    }

    this.db.prepare(`
      UPDATE orders
      SET status = ?, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStatus, rejectionReason || null, orderId);

    const updated = this.getOrderById(orderId)!;

    // Send Realtime notifications
    WebSocketBroker.getInstance().sendToUser(order.customerId, {
      type: 'ORDER_STATUS_CHANGED',
      payload: {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
        rejectionReason: updated.cancellationReason,
        updatedAt: updated.updatedAt
      }
    });

    WebSocketBroker.getInstance().broadcastToAdmins({
      type: 'ADMIN_ORDER_UPDATED',
      payload: {
        orderId: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt
      }
    });

    return updated;
  }

  public adminSuggestAlternative(orderId: string, data: {
    originalProductId: string;
    suggestedProductId: string;
    note?: string;
  }): OrderAlternative {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('NOT_FOUND: Order not found.');

    const original = this.db.prepare('SELECT * FROM products WHERE id = ?').get(data.originalProductId) as any;
    const suggested = this.db.prepare('SELECT * FROM products WHERE id = ?').get(data.suggestedProductId) as any;

    if (!original || !suggested) {
      throw new Error('INVALID_PRODUCT: Original or suggested product does not exist.');
    }

    const priceDiff = suggested.price_paise - original.price_paise;
    const altId = 'alt_' + crypto.randomUUID().slice(0, 10);

    this.db.prepare(`
      INSERT INTO order_alternatives (
        id, order_id, original_product_id, suggested_product_id,
        price_difference_paise, admin_note, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(
      altId,
      orderId,
      original.id,
      suggested.id,
      priceDiff,
      data.note?.trim() || null
    );

    this.db.prepare("UPDATE orders SET status = 'AWAITING_APPROVAL' WHERE id = ?").run(orderId);

    const alt: OrderAlternative = {
      id: altId,
      orderId,
      originalProductId: original.id,
      originalProductName: original.name,
      suggestedProductId: suggested.id,
      suggestedProductName: suggested.name,
      priceDifferencePaise: priceDiff,
      adminNote: data.note,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    // Notify customer
    WebSocketBroker.getInstance().sendToUser(order.customerId, {
      type: 'ALTERNATIVE_SUGGESTED',
      payload: alt
    });

    return alt;
  }

  public customerRespondAlternative(orderId: string, customerId: string, action: 'ACCEPT' | 'REJECT'): Order {
    const order = this.getOrderById(orderId);
    if (!order || order.customerId !== customerId) {
      throw new Error('UNAUTHORIZED: Order not found or not owned by you.');
    }

    const alt = this.db.prepare(`
      SELECT * FROM order_alternatives WHERE order_id = ? AND status = 'PENDING'
    `).get(orderId) as any;

    if (!alt) {
      throw new Error('NO_PENDING_ALTERNATIVE: No pending alternative suggestion found for this order.');
    }

    if (action === 'ACCEPT') {
      const suggested = this.db.prepare('SELECT * FROM products WHERE id = ?').get(alt.suggested_product_id) as any;

      // Update the item in order_items
      this.db.prepare(`
        UPDATE order_items
        SET product_id = ?, product_name = ?, unit_price_paise = ?, subtotal_paise = quantity * ?
        WHERE order_id = ? AND product_id = ?
      `).run(suggested.id, suggested.name, suggested.price_paise, suggested.price_paise, orderId, alt.original_product_id);

      // Recompute total
      const newItems = this.db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as any[];
      const newSubtotal = newItems.reduce((acc, it) => acc + it.subtotal_paise, 0);

      this.db.prepare(`
        UPDATE orders
        SET subtotal_paise = ?, total_paise = ?, status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newSubtotal, newSubtotal, orderId);

      this.db.prepare("UPDATE order_alternatives SET status = 'ACCEPTED', resolved_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(alt.id);
    } else {
      // REJECT alternative
      this.db.prepare("UPDATE order_alternatives SET status = 'REJECTED', resolved_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(alt.id);
      this.db.prepare("UPDATE orders SET status = 'CANCELLED', cancellation_reason = 'Alternative rejected by customer', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(orderId);
    }

    const updated = this.getOrderById(orderId)!;

    WebSocketBroker.getInstance().broadcastToAdmins({
      type: 'ALTERNATIVE_RESOLVED',
      payload: {
        orderId: updated.id,
        action,
        status: updated.status
      }
    });

    return updated;
  }

  public customerCancelOrder(orderId: string, customerId: string, reason?: string): Order {
    const order = this.getOrderById(orderId);
    if (!order || order.customerId !== customerId) {
      throw new Error('UNAUTHORIZED: Order not found or not owned by you.');
    }

    // Cancellation rule: ONLY allowed before admin confirmation
    if (order.status !== 'PLACED' && order.status !== 'AWAITING_APPROVAL') {
      throw new Error('CANCELLATION_NOT_ALLOWED: Confirmed orders cannot be cancelled by the customer. Please contact the admin directly.');
    }

    if (order.paymentMethod === 'CREDIT') {
      const profile = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(order.customerId) as any;
      if (profile) {
        const newUnpaid = Math.max(0, profile.unpaid_orders_count - 1);
        const newBal = Math.max(0, profile.outstanding_balance_paise - order.totalPaise);
        this.db.prepare(`
          UPDATE customer_profiles
          SET unpaid_orders_count = ?, outstanding_balance_paise = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `).run(newUnpaid, newBal, order.customerId);

        const ledgerId = 'ledg_' + crypto.randomUUID().slice(0, 10);
        this.db.prepare(`
          INSERT INTO credit_ledger (id, customer_id, order_id, entry_type, amount_paise, balance_after_paise, description, recorded_by)
          VALUES (?, ?, ?, 'CREDIT', ?, ?, 'Customer Cancelled Order', ?)
        `).run(ledgerId, order.customerId, order.id, order.totalPaise, newBal, customerId);
      }
    }

    this.db.prepare(`
      UPDATE orders
      SET status = 'CANCELLED', cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason || 'Cancelled by student before acceptance', orderId);

    const updated = this.getOrderById(orderId)!;

    WebSocketBroker.getInstance().broadcastToAdmins({
      type: 'ORDER_CANCELLED_BY_CUSTOMER',
      payload: {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        reason: updated.cancellationReason
      }
    });

    return updated;
  }

  private hydrateOrder(o: any): Order {
    const items = this.db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id) as any[];
    const alt = this.db.prepare('SELECT * FROM order_alternatives WHERE order_id = ?').get(o.id) as any;
    const profile = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(o.customer_id) as any;

    return {
      id: o.id,
      orderNumber: o.order_number,
      customerId: o.customer_id,
      sellerId: o.seller_id,
      status: o.status as OrderStatus,
      deliveryRoom: o.delivery_room,
      specialInstructions: o.special_instructions || undefined,
      isScheduled: Boolean(o.is_scheduled),
      scheduledFor: o.scheduled_for || undefined,
      subtotalPaise: o.subtotal_paise,
      deliveryFeePaise: o.delivery_fee_paise,
      discountPaise: o.discount_paise,
      totalPaise: o.total_paise,
      paymentMethod: o.payment_method as PaymentMethod,
      paymentStatus: o.payment_status,
      cancellationReason: o.cancellation_reason || undefined,
      estimatedDeliveryTime: o.estimated_delivery_time || undefined,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      items: items.map(it => ({
        id: it.id,
        orderId: it.order_id,
        productId: it.product_id,
        productName: it.product_name,
        unitPricePaise: it.unit_price_paise,
        quantity: it.quantity,
        subtotalPaise: it.subtotal_paise,
        selectedOptions: it.selected_options ? JSON.parse(it.selected_options) : undefined
      })),
      alternative: alt ? {
        id: alt.id,
        orderId: alt.order_id,
        originalProductId: alt.original_product_id,
        originalProductName: '',
        suggestedProductId: alt.suggested_product_id,
        suggestedProductName: '',
        priceDifferencePaise: alt.price_difference_paise,
        adminNote: alt.admin_note,
        status: alt.status,
        createdAt: alt.created_at,
        resolvedAt: alt.resolved_at
      } : undefined,
      customerProfile: profile ? {
        userId: profile.user_id,
        fullName: profile.full_name,
        roomNumber: profile.room_number,
        phoneNumber: profile.phone_number,
        creditStatus: profile.credit_status,
        unpaidOrdersCount: profile.unpaid_orders_count,
        outstandingBalancePaise: profile.outstanding_balance_paise,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      } : undefined
    };
  }
}
