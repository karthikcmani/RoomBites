import { getDb } from '../db/index.js';

export interface DashboardMetrics {
  todayOrdersCount: number;
  todaySalesPaise: number;
  completedOrdersCount: number;
  pendingOrdersCount: number;
  rejectedOrdersCount: number;
  totalOutstandingDuesPaise: number;
  onlineCustomersCount: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenuePaise: number;
  }>;
}

export class AnalyticsService {
  private db = getDb();

  public getDashboardMetrics(): DashboardMetrics {
    const today = new Date().toISOString().slice(0, 10);

    // Orders today
    const todayOrders = this.db.prepare(`
      SELECT * FROM orders WHERE created_at LIKE ?
    `).all(`${today}%`) as any[];

    const todayOrdersCount = todayOrders.length;
    let todaySalesPaise = 0;
    let completedOrdersCount = 0;
    let pendingOrdersCount = 0;
    let rejectedOrdersCount = 0;

    for (const o of todayOrders) {
      if (o.status === 'DELIVERED') {
        completedOrdersCount++;
        todaySalesPaise += o.total_paise;
      } else if (o.status === 'REJECTED' || o.status === 'CANCELLED') {
        rejectedOrdersCount++;
      } else {
        pendingOrdersCount++;
        if (o.payment_status === 'VERIFIED') {
          todaySalesPaise += o.total_paise;
        }
      }
    }

    // Total outstanding dues
    const duesResult = this.db.prepare(`
      SELECT SUM(outstanding_balance_paise) as total_dues FROM customer_profiles
    `).get() as any;
    const totalOutstandingDuesPaise = duesResult?.total_dues || 0;

    // Online customers
    const onlineResult = this.db.prepare(`
      SELECT COUNT(*) as online_count FROM customer_presence WHERE is_online = 1
    `).get() as any;
    const onlineCustomersCount = onlineResult?.online_count || 0;

    // Top selling products
    const topProductsRows = this.db.prepare(`
      SELECT product_id, product_name, SUM(quantity) as total_qty, SUM(subtotal_paise) as total_rev
      FROM order_items
      GROUP BY product_id, product_name
      ORDER BY total_qty DESC
      LIMIT 5
    `).all() as any[];

    const topProducts = topProductsRows.map(r => ({
      productId: r.product_id,
      productName: r.product_name,
      totalQuantity: r.total_qty,
      totalRevenuePaise: r.total_rev
    }));

    return {
      todayOrdersCount,
      todaySalesPaise,
      completedOrdersCount,
      pendingOrdersCount,
      rejectedOrdersCount,
      totalOutstandingDuesPaise,
      onlineCustomersCount,
      topProducts
    };
  }
}
