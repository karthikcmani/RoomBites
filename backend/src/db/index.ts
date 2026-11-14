import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: DatabaseSync;

  private constructor(dbPath?: string) {
    const targetPath = dbPath || process.env.DB_PATH || path.join(process.cwd(), 'roombites.db');
    if (targetPath !== ':memory:') {
      const dir = path.dirname(path.resolve(targetPath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new DatabaseSync(targetPath);
    this.initPragmas();
    this.initSchema();
  }

  public static getInstance(dbPath?: string): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(dbPath);
    }
    return DatabaseManager.instance;
  }

  public static createInMemory(): DatabaseManager {
    return new DatabaseManager(':memory:');
  }

  private initPragmas() {
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA journal_mode = WAL;');
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'CUSTOMER',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customer_profiles (
        user_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        room_number TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        credit_status TEXT NOT NULL DEFAULT 'DISABLED',
        unpaid_orders_count INTEGER NOT NULL DEFAULT 0,
        outstanding_balance_paise INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sellers (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE,
        shop_name TEXT NOT NULL DEFAULT 'RoomBites Night Mess',
        room_number TEXT NOT NULL,
        emergency_contact TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS shop_settings (
        id TEXT PRIMARY KEY,
        seller_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'AVAILABLE',
        status_note TEXT,
        opening_time_ist TEXT NOT NULL DEFAULT '21:00',
        closing_time_ist TEXT NOT NULL DEFAULT '05:00',
        auto_schedule_enabled INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (seller_id) REFERENCES sellers(id)
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        seller_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price_paise INTEGER NOT NULL CHECK (price_paise >= 0),
        image_url TEXT,
        stock_status TEXT NOT NULL DEFAULT 'IN_STOCK',
        is_available INTEGER NOT NULL DEFAULT 1,
        has_customization INTEGER NOT NULL DEFAULT 0,
        customization_schema TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (seller_id) REFERENCES sellers(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        customer_id TEXT NOT NULL,
        seller_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PLACED',
        delivery_room TEXT NOT NULL,
        special_instructions TEXT,
        is_scheduled INTEGER NOT NULL DEFAULT 0,
        scheduled_for TEXT,
        subtotal_paise INTEGER NOT NULL CHECK (subtotal_paise >= 0),
        delivery_fee_paise INTEGER NOT NULL DEFAULT 0,
        discount_paise INTEGER NOT NULL DEFAULT 0,
        total_paise INTEGER NOT NULL CHECK (total_paise >= 0),
        payment_method TEXT NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'PENDING',
        cancellation_reason TEXT,
        estimated_delivery_time TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (seller_id) REFERENCES sellers(id)
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        unit_price_paise INTEGER NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        subtotal_paise INTEGER NOT NULL CHECK (subtotal_paise >= 0),
        selected_options TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS order_alternatives (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        original_product_id TEXT NOT NULL,
        suggested_product_id TEXT NOT NULL,
        price_difference_paise INTEGER NOT NULL DEFAULT 0,
        admin_note TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (original_product_id) REFERENCES products(id),
        FOREIGN KEY (suggested_product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        amount_paise INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        transaction_ref TEXT,
        verified_by_user_id TEXT,
        verified_at TEXT,
        refund_reason TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (verified_by_user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS credit_ledger (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        order_id TEXT,
        entry_type TEXT NOT NULL,
        amount_paise INTEGER NOT NULL,
        balance_after_paise INTEGER NOT NULL,
        description TEXT NOT NULL,
        recorded_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (recorded_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS customer_presence (
        user_id TEXT PRIMARY KEY,
        is_online INTEGER NOT NULL DEFAULT 0,
        activity TEXT DEFAULT 'idle',
        current_page TEXT,
        last_heartbeat TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        disconnected_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        seller_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        badge_type TEXT DEFAULT 'INFO',
        is_active INTEGER NOT NULL DEFAULT 1,
        expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (seller_id) REFERENCES sellers(id)
      );

      CREATE TABLE IF NOT EXISTS product_reviews (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (customer_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS otps (
        email TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_credit_ledger_cust ON credit_ledger(customer_id);
      CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id);
    `);
  }

  public getRawDb(): DatabaseSync {
    return this.db;
  }

  public exec(sql: string) {
    return this.db.exec(sql);
  }

  public prepare(sql: string) {
    return this.db.prepare(sql);
  }
}

export const getDb = (): DatabaseSync => DatabaseManager.getInstance().getRawDb();
