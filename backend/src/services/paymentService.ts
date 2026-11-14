import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { PaymentRecord, CreditLedgerEntry, CustomerProfile, PaymentMethod } from '../types/index.js';
import { WebSocketBroker } from '../websocket/server.js';

export class PaymentService {
  private db = getDb();

  public verifyPayment(adminId: string, data: {
    orderId: string;
    paymentMethod: PaymentMethod;
    transactionRef?: string;
    amountPaise: number;
  }): PaymentRecord {
    const order = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(data.orderId) as any;
    if (!order) throw new Error('NOT_FOUND: Order not found.');

    const paymentId = 'pay_' + crypto.randomUUID().slice(0, 10);

    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.prepare(`
        INSERT INTO payments (
          id, order_id, customer_id, payment_method, amount_paise,
          status, transaction_ref, verified_by_user_id, verified_at
        ) VALUES (?, ?, ?, ?, ?, 'VERIFIED', ?, ?, CURRENT_TIMESTAMP)
      `).run(
        paymentId,
        data.orderId,
        order.customer_id,
        data.paymentMethod,
        data.amountPaise,
        data.transactionRef?.trim() || null,
        adminId
      );

      // Transition order status if pending
      const nextStatus = (order.status === 'PAYMENT_PENDING' || order.status === 'ACCEPTED') ? 'PAID' : order.status;
      this.db.prepare(`
        UPDATE orders
        SET payment_status = 'VERIFIED', status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nextStatus, data.orderId);

      // If this was a credit order being paid off, update profile ledger
      if (order.payment_method === 'CREDIT') {
        const profile = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(order.customer_id) as any;
        if (profile) {
          const newUnpaid = Math.max(0, profile.unpaid_orders_count - 1);
          const newBal = Math.max(0, profile.outstanding_balance_paise - data.amountPaise);

          this.db.prepare(`
            UPDATE customer_profiles
            SET unpaid_orders_count = ?, outstanding_balance_paise = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
          `).run(newUnpaid, newBal, order.customer_id);

          const ledgerId = 'ledg_' + crypto.randomUUID().slice(0, 10);
          this.db.prepare(`
            INSERT INTO credit_ledger (
              id, customer_id, order_id, entry_type, amount_paise,
              balance_after_paise, description, recorded_by
            ) VALUES (?, ?, ?, 'CREDIT', ?, ?, 'Settlement for Order #${order.order_number}', ?)
          `).run(ledgerId, order.customer_id, order.id, data.amountPaise, newBal, adminId);
        }
      }

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    // Notify customer
    WebSocketBroker.getInstance().sendToUser(order.customer_id, {
      type: 'PAYMENT_VERIFIED',
      payload: {
        orderId: data.orderId,
        amountPaise: data.amountPaise,
        paymentMethod: data.paymentMethod,
        status: 'VERIFIED'
      }
    });

    const payment = this.db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as any;
    return {
      id: payment.id,
      orderId: payment.order_id,
      customerId: payment.customer_id,
      paymentMethod: payment.payment_method as PaymentMethod,
      amountPaise: payment.amount_paise,
      status: payment.status,
      transactionRef: payment.transaction_ref,
      verifiedByUserId: payment.verified_by_user_id,
      verifiedAt: payment.verified_at,
      refundReason: payment.refund_reason,
      createdAt: payment.created_at
    };
  }

  public requestCredit(customerId: string): CustomerProfile {
    const profile = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(customerId) as any;
    if (!profile) throw new Error('PROFILE_REQUIRED: Complete your profile first.');

    this.db.prepare(`
      UPDATE customer_profiles
      SET credit_status = 'REQUESTED', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(customerId);

    WebSocketBroker.getInstance().broadcastToAdmins({
      type: 'CREDIT_REQUEST_SUBMITTED',
      payload: {
        customerId,
        customerName: profile.full_name,
        roomNumber: profile.room_number
      }
    });

    const updated = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(customerId) as any;
    return this.mapProfile(updated);
  }

  public adminSetCreditStatus(adminId: string, customerId: string, status: 'APPROVED' | 'REVOKED' | 'DISABLED'): CustomerProfile {
    const profile = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(customerId) as any;
    if (!profile) throw new Error('NOT_FOUND: Customer profile not found.');

    this.db.prepare(`
      UPDATE customer_profiles
      SET credit_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(status, customerId);

    WebSocketBroker.getInstance().sendToUser(customerId, {
      type: 'CREDIT_STATUS_UPDATED',
      payload: {
        status,
        message: status === 'APPROVED' ? 'Your credit request has been approved by admin.' : 'Your credit privilege status has been updated.'
      }
    });

    const updated = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(customerId) as any;
    return this.mapProfile(updated);
  }

  public adminSettleDues(adminId: string, data: {
    customerId: string;
    amountPaise: number;
    description: string;
  }): { profile: CustomerProfile; ledgerEntry: CreditLedgerEntry } {
    if (data.amountPaise <= 0) throw new Error('INVALID_AMOUNT: Settlement amount must be greater than zero.');

    const profile = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(data.customerId) as any;
    if (!profile) throw new Error('NOT_FOUND: Customer profile not found.');

    const newBal = Math.max(0, profile.outstanding_balance_paise - data.amountPaise);
    // If balance is now 0, clear unpaid orders count
    const newUnpaid = newBal === 0 ? 0 : Math.max(0, profile.unpaid_orders_count - 1);

    const ledgerId = 'ledg_' + crypto.randomUUID().slice(0, 10);

    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.prepare(`
        UPDATE customer_profiles
        SET outstanding_balance_paise = ?, unpaid_orders_count = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(newBal, newUnpaid, data.customerId);

      this.db.prepare(`
        INSERT INTO credit_ledger (
          id, customer_id, entry_type, amount_paise, balance_after_paise, description, recorded_by
        ) VALUES (?, ?, 'CREDIT', ?, ?, ?, ?)
      `).run(
        ledgerId,
        data.customerId,
        data.amountPaise,
        newBal,
        data.description.trim() || 'Manual Dues Settlement',
        adminId
      );

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    const updatedProf = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(data.customerId) as any;
    const ledger = this.db.prepare('SELECT * FROM credit_ledger WHERE id = ?').get(ledgerId) as any;

    WebSocketBroker.getInstance().sendToUser(data.customerId, {
      type: 'DUES_SETTLED',
      payload: {
        amountPaise: data.amountPaise,
        remainingBalancePaise: newBal
      }
    });

    return {
      profile: this.mapProfile(updatedProf),
      ledgerEntry: {
        id: ledger.id,
        customerId: ledger.customer_id,
        orderId: ledger.order_id,
        entryType: ledger.entry_type,
        amountPaise: ledger.amount_paise,
        balanceAfterPaise: ledger.balance_after_paise,
        description: ledger.description,
        recordedBy: ledger.recorded_by,
        createdAt: ledger.created_at
      }
    };
  }

  public getCreditLedger(customerId: string): CreditLedgerEntry[] {
    const rows = this.db.prepare(`
      SELECT * FROM credit_ledger WHERE customer_id = ? ORDER BY created_at DESC
    `).all(customerId) as any[];

    return rows.map(r => ({
      id: r.id,
      customerId: r.customer_id,
      orderId: r.order_id,
      entryType: r.entry_type,
      amountPaise: r.amount_paise,
      balanceAfterPaise: r.balance_after_paise,
      description: r.description,
      recordedBy: r.recorded_by,
      createdAt: r.created_at
    }));
  }

  public getAllCustomersAdmin(): CustomerProfile[] {
    const rows = this.db.prepare('SELECT * FROM customer_profiles ORDER BY full_name ASC').all() as any[];
    return rows.map(this.mapProfile);
  }

  private mapProfile(p: any): CustomerProfile {
    return {
      userId: p.user_id,
      fullName: p.full_name,
      roomNumber: p.room_number,
      phoneNumber: p.phone_number,
      creditStatus: p.credit_status,
      unpaidOrdersCount: p.unpaid_orders_count,
      outstandingBalancePaise: p.outstanding_balance_paise,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    };
  }
}
