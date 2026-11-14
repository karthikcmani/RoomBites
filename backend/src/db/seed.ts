import { getDb } from './index.js';
import crypto from 'node:crypto';

export function runSeed(db = getDb()) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@rit.ac.in';
  const adminId = 'usr_admin_001';
  const sellerId = 'seller_primary';

  // 1. Ensure Admin User exists
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail) as { id: string } | undefined;
  if (!existingAdmin) {
    db.prepare(`
      INSERT INTO users (id, email, role, is_active)
      VALUES (?, ?, 'ADMIN', 1)
    `).run(adminId, adminEmail);

    db.prepare(`
      INSERT INTO customer_profiles (user_id, full_name, room_number, phone_number, credit_status)
      VALUES (?, 'RoomBites Admin', 'Admin Room 101', '+919876543210', 'APPROVED')
    `).run(adminId);
  }

  // 2. Ensure Primary Seller exists
  const activeAdminId = existingAdmin ? existingAdmin.id : adminId;
  const existingSeller = db.prepare('SELECT id FROM sellers WHERE id = ?').get(sellerId);
  if (!existingSeller) {
    db.prepare(`
      INSERT INTO sellers (id, user_id, shop_name, room_number, emergency_contact, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(sellerId, activeAdminId, 'RoomBites Night Mess', "Room 101 (Men's Hostel)", '+919876543210');
  }

  // 3. Ensure Shop Settings exist
  const existingSettings = db.prepare('SELECT id FROM shop_settings WHERE seller_id = ?').get(sellerId);
  if (!existingSettings) {
    db.prepare(`
      INSERT INTO shop_settings (id, seller_id, status, status_note, opening_time_ist, closing_time_ist, auto_schedule_enabled)
      VALUES (?, ?, 'AVAILABLE', 'Fresh & hot midnight snacks delivered directly to your hostel room.', '21:00', '05:00', 1)
    `).run('setting_primary', sellerId);
  }

  // 4. Categories
  const categories = [
    { id: 'cat_tea', name: 'Tea', slug: 'tea', order: 1 },
    { id: 'cat_coffee', name: 'Coffee', slug: 'coffee', order: 2 },
    { id: 'cat_health', name: 'Health Drinks', slug: 'health-drinks', order: 3 },
    { id: 'cat_snacks', name: 'Snacks', slug: 'snacks', order: 4 },
    { id: 'cat_instant', name: 'Instant Food', slug: 'instant-food', order: 5 },
    { id: 'cat_fruits', name: 'Fruits', slug: 'fruits', order: 6 },
  ];

  for (const cat of categories) {
    const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(cat.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO categories (id, name, slug, display_order, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(cat.id, cat.name, cat.slug, cat.order);
    }
  }

  // 5. Products
  const products = [
    // Tea
    {
      id: 'prod_tea_normal',
      categoryId: 'cat_tea',
      name: 'Normal Tea',
      description: 'Hot brewed freshly made milk tea with cardamom aroma',
      pricePaise: 1200, // ₹12.00
      stockStatus: 'IN_STOCK',
      hasCustomization: 1,
      customizationSchema: JSON.stringify({
        sugar: ['None', 'Less', 'Normal', 'Extra'],
        strength: ['Light', 'Strong']
      })
    },
    {
      id: 'prod_tea_black',
      categoryId: 'cat_tea',
      name: 'Black Tea',
      description: 'Light refreshing black tea brewed with fresh tea leaves',
      pricePaise: 1000, // ₹10.00
      stockStatus: 'IN_STOCK',
      hasCustomization: 1,
      customizationSchema: JSON.stringify({
        sugar: ['None', 'Less', 'Normal', 'Extra']
      })
    },
    // Coffee
    {
      id: 'prod_coffee_bru',
      categoryId: 'cat_coffee',
      name: 'Bru Coffee',
      description: 'Rich and invigorating hot Bru filter blend milk coffee',
      pricePaise: 1500, // ₹15.00
      stockStatus: 'IN_STOCK',
      hasCustomization: 1,
      customizationSchema: JSON.stringify({
        sugar: ['None', 'Less', 'Normal', 'Extra'],
        strength: ['Normal', 'Strong']
      })
    },
    {
      id: 'prod_coffee_black',
      categoryId: 'cat_coffee',
      name: 'Black Coffee',
      description: 'Fresh aromatic piping-hot black coffee',
      pricePaise: 1200, // ₹12.00
      stockStatus: 'IN_STOCK',
      hasCustomization: 1,
      customizationSchema: JSON.stringify({
        sugar: ['None', 'Less', 'Normal', 'Extra']
      })
    },
    // Health Drinks
    {
      id: 'prod_health_boost',
      categoryId: 'cat_health',
      name: 'Boost',
      description: 'Malted chocolate energy health drink served hot',
      pricePaise: 2000, // ₹20.00
      stockStatus: 'IN_STOCK',
      hasCustomization: 1,
      customizationSchema: JSON.stringify({
        sugar: ['Normal', 'Extra']
      })
    },
    {
      id: 'prod_health_horlicks',
      categoryId: 'cat_health',
      name: 'Horlicks',
      description: 'Classic malted wholesome hot milk drink',
      pricePaise: 2000, // ₹20.00
      stockStatus: 'IN_STOCK',
      hasCustomization: 1,
      customizationSchema: JSON.stringify({
        sugar: ['Normal', 'Extra']
      })
    },
    // Snacks
    {
      id: 'prod_snack_biscuits',
      categoryId: 'cat_snacks',
      name: 'Biscuits (Pack)',
      description: 'Crispy Parle-G / Marie tea-time biscuits pack',
      pricePaise: 1000, // ₹10.00
      stockStatus: 'IN_STOCK',
      hasCustomization: 0,
      customizationSchema: null
    },
    {
      id: 'prod_snack_bread',
      categoryId: 'cat_snacks',
      name: 'Bread Slices (Butter / Jam)',
      description: 'Fresh soft bread slices with butter or sweet jam spread',
      pricePaise: 2500, // ₹25.00
      stockStatus: 'IN_STOCK',
      hasCustomization: 1,
      customizationSchema: JSON.stringify({
        topping: ['Butter', 'Jam', 'Both']
      })
    },
    // Instant Food
    {
      id: 'prod_instant_noodles',
      categoryId: 'cat_instant',
      name: 'Maggi / Instant Noodles',
      description: 'Midnight hot spicy soupy Maggi noodles cooked with masala',
      pricePaise: 3000, // ₹30.00
      stockStatus: 'IN_STOCK',
      hasCustomization: 1,
      customizationSchema: JSON.stringify({
        spice: ['Normal', 'Spicy', 'Extra Spicy'],
        style: ['Soupy', 'Dry']
      })
    },
    // Fruits
    {
      id: 'prod_fruit_banana',
      categoryId: 'cat_fruits',
      name: 'Fresh Bananas (Per piece)',
      description: 'Fresh ripe wholesome Robusta / Nendran banana',
      pricePaise: 500, // ₹5.00
      stockStatus: 'IN_STOCK',
      hasCustomization: 0,
      customizationSchema: null
    }
  ];

  for (const prod of products) {
    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(prod.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO products (
          id, seller_id, category_id, name, description, price_paise,
          stock_status, is_available, has_customization, customization_schema
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        prod.id,
        sellerId,
        prod.categoryId,
        prod.name,
        prod.description,
        prod.pricePaise,
        prod.stockStatus,
        prod.hasCustomization,
        prod.customizationSchema
      );
    }
  }

  // 6. Sample Announcement
  const annId = 'ann_welcome_001';
  const existingAnn = db.prepare('SELECT id FROM announcements WHERE id = ?').get(annId);
  if (!existingAnn) {
    db.prepare(`
      INSERT INTO announcements (id, seller_id, title, message, badge_type, is_active)
      VALUES (?, ?, 'Welcome to RoomBites!', 'Night Mess is officially live! Order your midnight tea, coffee & Maggi delivered right to your room.', 'SPECIAL', 1)
    `).run(annId, sellerId);
  }

  console.log('[RoomBites Seed] Initial database seed successfully completed.');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed();
}
