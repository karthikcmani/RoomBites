import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { Product, Category, StockStatus } from '../types/index.js';

export class ProductService {
  private db = getDb();

  public getCategories(): Category[] {
    const rows = this.db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      displayOrder: r.display_order,
      isActive: Boolean(r.is_active)
    }));
  }

  public getProducts(categoryId?: string): Product[] {
    let sql = 'SELECT * FROM products WHERE is_available = 1';
    const params: any[] = [];
    if (categoryId) {
      sql += ' AND category_id = ?';
      params.push(categoryId);
    }
    sql += ' ORDER BY created_at ASC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(this.mapRowToProduct);
  }

  public getAllProductsAdmin(): Product[] {
    const rows = this.db.prepare('SELECT * FROM products ORDER BY created_at ASC').all() as any[];
    return rows.map(this.mapRowToProduct);
  }

  public getProductById(id: string): Product | null {
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRowToProduct(row);
  }

  public createProduct(data: {
    name: string;
    categoryId: string;
    description?: string;
    pricePaise: number;
    imageUrl?: string;
    stockStatus?: StockStatus;
    hasCustomization?: boolean;
    customizationSchema?: any;
    sellerId?: string;
  }): Product {
    if (data.pricePaise < 0) {
      throw new Error('INVALID_PRICE: Price cannot be negative.');
    }

    const id = 'prod_' + crypto.randomUUID().slice(0, 10);
    const sellerId = data.sellerId || 'seller_primary';
    const stockStatus = data.stockStatus || 'IN_STOCK';
    const hasCustomization = data.hasCustomization ? 1 : 0;
    const schemaStr = data.customizationSchema ? JSON.stringify(data.customizationSchema) : null;

    this.db.prepare(`
      INSERT INTO products (
        id, seller_id, category_id, name, description, price_paise,
        image_url, stock_status, is_available, has_customization, customization_schema
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      sellerId,
      data.categoryId,
      data.name.trim(),
      data.description?.trim() || '',
      data.pricePaise,
      data.imageUrl || null,
      stockStatus,
      hasCustomization,
      schemaStr
    );

    return this.getProductById(id)!;
  }

  public updateProduct(id: string, data: Partial<Product>): Product {
    const current = this.getProductById(id);
    if (!current) throw new Error('NOT_FOUND: Product not found.');

    const name = data.name !== undefined ? data.name.trim() : current.name;
    const desc = data.description !== undefined ? data.description.trim() : current.description;
    const price = data.pricePaise !== undefined ? data.pricePaise : current.pricePaise;
    const stock = data.stockStatus !== undefined ? data.stockStatus : current.stockStatus;
    const isAvail = data.isAvailable !== undefined ? (data.isAvailable ? 1 : 0) : (current.isAvailable ? 1 : 0);
    const catId = data.categoryId !== undefined ? data.categoryId : current.categoryId;
    const hasCust = data.hasCustomization !== undefined ? (data.hasCustomization ? 1 : 0) : (current.hasCustomization ? 1 : 0);
    const schemaStr = data.customizationSchema !== undefined ? JSON.stringify(data.customizationSchema) : (current.customizationSchema ? JSON.stringify(current.customizationSchema) : null);

    if (price < 0) throw new Error('INVALID_PRICE: Price cannot be negative.');

    this.db.prepare(`
      UPDATE products
      SET name = ?, description = ?, price_paise = ?, stock_status = ?,
          is_available = ?, category_id = ?, has_customization = ?, customization_schema = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, desc, price, stock, isAvail, catId, hasCust, schemaStr, id);

    return this.getProductById(id)!;
  }

  public toggleAvailability(id: string, isAvailable: boolean): Product {
    this.db.prepare('UPDATE products SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(isAvailable ? 1 : 0, id);
    return this.getProductById(id)!;
  }

  public updateStockStatus(id: string, stockStatus: StockStatus): Product {
    this.db.prepare('UPDATE products SET stock_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(stockStatus, id);
    return this.getProductById(id)!;
  }

  private mapRowToProduct(r: any): Product {
    return {
      id: r.id,
      sellerId: r.seller_id,
      categoryId: r.category_id,
      name: r.name,
      description: r.description || '',
      pricePaise: r.price_paise,
      imageUrl: r.image_url || undefined,
      stockStatus: r.stock_status as StockStatus,
      isAvailable: Boolean(r.is_available),
      hasCustomization: Boolean(r.has_customization),
      customizationSchema: r.customization_schema ? JSON.parse(r.customization_schema) : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }
}
