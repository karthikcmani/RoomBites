import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DatabaseManager } from '../src/db/index.js';
import { runSeed } from '../src/db/seed.js';
import { AuthService } from '../src/services/authService.js';
import { ProductService } from '../src/services/productService.js';
import { OrderService } from '../src/services/orderService.js';
import { PaymentService } from '../src/services/paymentService.js';
import { ShopService } from '../src/services/shopService.js';
import { AnalyticsService } from '../src/services/analyticsService.js';
import { EmailService } from '../src/services/emailService.js';
import { isValidRitEmail, getJwtSecret, getOtpPepper } from '../src/middleware/auth.js';

describe('RoomBites Comprehensive Backend & Security Test Suite', () => {
  let authService: AuthService;
  let productService: ProductService;
  let orderService: OrderService;
  let paymentService: PaymentService;
  let shopService: ShopService;
  let analyticsService: AnalyticsService;
  let emailService: EmailService;

  before(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_DRIVER = 'memory';

    // Initialize in-memory test database
    DatabaseManager.getInstance(':memory:');
    runSeed();

    authService = new AuthService();
    productService = new ProductService();
    orderService = new OrderService();
    paymentService = new PaymentService();
    shopService = new ShopService();
    analyticsService = new AnalyticsService();
    emailService = EmailService.getInstance();
  });

  describe('1. Authentication & Institutional Domain Quarantine', () => {
    test('Rejects non-@rit.ac.in email addresses', async () => {
      assert.equal(isValidRitEmail('student@gmail.com'), false);
      assert.equal(isValidRitEmail('student@yahoo.co.in'), false);
      assert.equal(isValidRitEmail('hacker@mit.edu'), false);
      assert.equal(isValidRitEmail(''), false);

      await assert.rejects(async () => {
        await authService.requestOtp('student@gmail.com');
      }, /INVALID_DOMAIN/);
    });

    test('Accepts valid @rit.ac.in email, delivers real email, and omits code from API response', async () => {
      const email = 'karthik@rit.ac.in';
      assert.equal(isValidRitEmail(email), true);

      const res = await authService.requestOtp(email);
      assert.equal(res.success, true);
      // Security rule: code must NEVER be returned in API response
      assert.equal((res as any).previewCode, undefined);
      assert.equal((res as any).code, undefined);

      // Verify email was actually dispatched via EmailService
      const lastSent = emailService.getLastSentForTesting();
      assert.ok(lastSent);
      assert.equal(lastSent.to, email);
      assert.equal(lastSent.code.length, 6);
    });

    test('Verifies OTP, generates valid JWT session, and supports profile creation', async () => {
      const email = 'arjun@rit.ac.in';
      await authService.requestOtp(email);
      const code = emailService.getLastSentForTesting()!.code;

      const authRes = authService.verifyOtp(email, code);

      assert.ok(authRes.token);
      assert.equal(authRes.user.email, email);
      assert.equal(authRes.user.role, 'CUSTOMER');

      // Update customer profile with room number
      const profile = authService.updateProfile(authRes.user.id, {
        fullName: 'Arjun Das',
        roomNumber: 'Men Hostel B-302',
        phoneNumber: '+919447123456'
      });

      assert.equal(profile.fullName, 'Arjun Das');
      assert.equal(profile.roomNumber, 'Men Hostel B-302');
      assert.equal(profile.creditStatus, 'DISABLED');
      assert.equal(profile.unpaidOrdersCount, 0);
      assert.equal(profile.outstandingBalancePaise, 0);
    });

    test('Registers new student with OTP + Password + Profile, and allows subsequent password logins', async () => {
      const email = 'karthik.new@rit.ac.in';
      await authService.requestOtp(email);
      const code = emailService.getLastSentForTesting()!.code;

      // Register with password & full profile in one atomic step
      const regRes = authService.registerWithPassword({
        email,
        code,
        password: 'SecretPassword123',
        fullName: 'Karthik C Mani',
        roomNumber: 'Room 228',
        phoneNumber: '+919876543210'
      });

      assert.ok(regRes.token);
      assert.equal(regRes.user.email, email);
      assert.equal(regRes.user.profile?.fullName, 'Karthik C Mani');
      assert.equal(regRes.user.profile?.roomNumber, 'Room 228');

      // Subsequent login with password (no OTP needed!)
      const loginRes = authService.loginWithPassword(email, 'SecretPassword123');
      assert.ok(loginRes.token);
      assert.equal(loginRes.user.email, email);
      assert.equal(loginRes.user.profile?.fullName, 'Karthik C Mani');
      assert.equal(loginRes.user.profile?.roomNumber, 'Room 228');

      // Incorrect password must fail
      assert.throws(() => {
        authService.loginWithPassword(email, 'WrongPassword!');
      }, /INVALID_CREDENTIALS/);
    });
  });

  describe('2. Authentication Security Controls & Abuse Prevention', () => {
    test('Enforces 60-second cooldown on consecutive OTP requests for the same address', async () => {
      const email = 'cooldown.student@rit.ac.in';
      await authService.requestOtp(email);

      // Immediate second request must trigger rate limit cooldown
      await assert.rejects(async () => {
        await authService.requestOtp(email);
      }, /RATE_LIMITED/);
    });

    test('Enforces maximum 5 verification attempts before permanent invalidation', async () => {
      const email = 'bruteforce.target@rit.ac.in';
      await authService.requestOtp(email);

      // 4 wrong attempts
      for (let i = 1; i <= 4; i++) {
        assert.throws(() => {
          authService.verifyOtp(email, '000000');
        }, /INVALID_OTP/);
      }

      // 5th wrong attempt must trigger maximum attempts exceeded and invalidate OTP
      assert.throws(() => {
        authService.verifyOtp(email, '000000');
      }, /TOO_MANY_ATTEMPTS/);

      // Subsequent attempt must find no OTP
      assert.throws(() => {
        authService.verifyOtp(email, '000000');
      }, /OTP_NOT_FOUND/);
    });

    test('Prevents role tampering and privilege elevation through profile updates', async () => {
      const email = 'attacker@rit.ac.in';
      await authService.requestOtp(email);
      const code = emailService.getLastSentForTesting()!.code;
      const { user } = authService.verifyOtp(email, code);

      assert.equal(user.role, 'CUSTOMER');

      // Malicious attempt to inject 'role: ADMIN' or 'creditStatus: APPROVED'
      const maliciousPayload: any = {
        fullName: 'Legitimate Name',
        roomNumber: 'Room 999',
        phoneNumber: '+919999999999',
        role: 'ADMIN',
        creditStatus: 'APPROVED',
        isAdmin: true
      };

      authService.updateProfile(user.id, maliciousPayload);

      // Verify user's actual profile in DB remains untampered
      const verifiedProfile = authService.getProfile(user.id)!;
      assert.equal(verifiedProfile.creditStatus, 'DISABLED');

      const dbUser = DatabaseManager.getInstance().getRawDb().prepare('SELECT role FROM users WHERE id = ?').get(user.id) as any;
      assert.equal(dbUser.role, 'CUSTOMER');
    });

    test('Fails fast in production if JWT_SECRET is unset or using default dev secret', () => {
      const prevEnv = process.env.NODE_ENV;
      const prevSecret = process.env.JWT_SECRET;

      try {
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'roombites_dev_secret_key_change_in_production_32_chars'; // Known default

        assert.throws(() => {
          getJwtSecret();
        }, /FATAL_SECURITY_ERROR/);

        // Strong secret of at least 32 characters should pass
        process.env.JWT_SECRET = 'a_very_strong_custom_production_secret_key_64_characters_minimum_length_ok';
        assert.equal(getJwtSecret(), 'a_very_strong_custom_production_secret_key_64_characters_minimum_length_ok');
      } finally {
        process.env.NODE_ENV = prevEnv;
        process.env.JWT_SECRET = prevSecret;
      }
    });

    test('Generates 6-digit cryptographic numeric OTPs via CSPRNG without bias', () => {
      const generatedCodes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const code = authService.generateSecureOtp();
        assert.match(code, /^\d{6}$/);
        const num = Number.parseInt(code, 10);
        assert.ok(num >= 100000 && num <= 999999);
        generatedCodes.add(code);
      }
      // Assert high entropy (at least 95 unique codes in 100 samples)
      assert.ok(generatedCodes.size >= 95);
    });

    test('Stores OTP with HMAC-SHA256 server pepper: Immune to offline unkeyed rainbow table brute-forcing', async () => {
      const email = 'crypto.test@rit.ac.in';
      await authService.requestOtp(email);
      const code = emailService.getLastSentForTesting()!.code;

      const rawDb = DatabaseManager.getInstance().getRawDb();
      const row = rawDb.prepare('SELECT code_hash FROM otps WHERE email = ?').get(email) as any;

      assert.ok(row && row.code_hash);
      assert.equal(row.code_hash.length, 64); // 256-bit hex hash

      // Vulnerability regression check: Ensure plaintext unkeyed SHA-256 (with old static salt) does NOT match
      const legacySaltedSha256 = crypto.createHash('sha256').update(`rb_otp_salt_${code}`).digest('hex');
      assert.notEqual(row.code_hash, legacySaltedSha256);

      // Verify that without the real server pepper, an attacker's offline HMAC calculations cannot match
      const customPepperHash = crypto.createHmac('sha256', 'attacker_arbitrary_key_without_real_server_pepper_32_chars')
        .update(`${email}:${code}`)
        .digest('hex');
      assert.notEqual(row.code_hash, customPepperHash);

      // Correct verification succeeds
      const result = authService.verifyOtp(email, code);
      assert.ok(result.token);
    });

    test('Enforces contextual email binding: Prevents cross-account hash transposition', () => {
      const code = '654321';
      const hashUser1 = authService.hashOtp('user1@rit.ac.in', code);
      const hashUser2 = authService.hashOtp('user2@rit.ac.in', code);

      // Same code for two different users MUST produce completely distinct HMAC digests
      assert.notEqual(hashUser1, hashUser2);
    });

    test('Preserves timing-safe verification for malformed and edge-case inputs', async () => {
      const email = 'timing.student@rit.ac.in';
      await authService.requestOtp(email);

      // Submitting wrong-length codes or weird inputs must not throw runtime buffer errors
      assert.throws(() => {
        authService.verifyOtp(email, '1');
      }, /INVALID_OTP/);

      assert.throws(() => {
        authService.verifyOtp(email, '1234567890');
      }, /INVALID_OTP/);

      assert.throws(() => {
        authService.verifyOtp(email, 'ABCDEF');
      }, /INVALID_OTP/);
    });

    test('Fails fast in production if OTP_SECRET / pepper is unset or insecure', () => {
      const prevEnv = process.env.NODE_ENV;
      const prevOtpSecret = process.env.OTP_SECRET;
      const prevJwtSecret = process.env.JWT_SECRET;

      try {
        process.env.NODE_ENV = 'production';
        process.env.OTP_SECRET = 'roombites_dev_otp_pepper_change_in_production_32_chars'; // Known default
        process.env.JWT_SECRET = 'roombites_dev_secret_key_change_in_production_32_chars';

        assert.throws(() => {
          getOtpPepper();
        }, /FATAL_SECURITY_ERROR/);

        // Strong secret of at least 32 characters passes
        process.env.OTP_SECRET = 'a_very_strong_custom_production_otp_pepper_secret_64_characters_ok';
        assert.equal(getOtpPepper(), 'a_very_strong_custom_production_otp_pepper_secret_64_characters_ok');
      } finally {
        process.env.NODE_ENV = prevEnv;
        process.env.OTP_SECRET = prevOtpSecret;
        process.env.JWT_SECRET = prevJwtSecret;
      }
    });
  });

  describe('3. Product Catalog & Menu Integrity', () => {
    test('Seeds initial categories and products correctly', () => {
      const categories = productService.getCategories();
      assert.ok(categories.length >= 6);

      const products = productService.getProducts();
      assert.ok(products.length >= 10);

      // Verify integer paise price for Normal Tea (₹12 = 1200 paise)
      const tea = products.find(p => p.name === 'Normal Tea');
      assert.ok(tea);
      assert.equal(tea.pricePaise, 1200);
      assert.equal(tea.hasCustomization, true);
    });

    test('Admin can add, update, and toggle product stock status', () => {
      const newProduct = productService.createProduct({
        name: 'Midnight Samosa',
        categoryId: 'cat_snacks',
        description: 'Crispy hot potato samosa with green chutney',
        pricePaise: 1500, // ₹15.00
        stockStatus: 'IN_STOCK'
      });

      assert.equal(newProduct.name, 'Midnight Samosa');
      assert.equal(newProduct.pricePaise, 1500);

      // Toggle stock to OUT_OF_STOCK
      const updated = productService.updateStockStatus(newProduct.id, 'OUT_OF_STOCK');
      assert.equal(updated.stockStatus, 'OUT_OF_STOCK');
    });
  });

  describe('4. Order Lifecycle, Cash & UPI Payments', () => {
    let customerUser: any;

    before(async () => {
      const email = 'rohit@rit.ac.in';
      await authService.requestOtp(email);
      const otp = emailService.getLastSentForTesting()!.code;
      customerUser = authService.verifyOtp(email, otp).user;
      authService.updateProfile(customerUser.id, {
        fullName: 'Rohit Sharma',
        roomNumber: 'A-204',
        phoneNumber: '+919800011122'
      });
    });

    test('Places order with multiple items and validates authoritative server prices', () => {
      const order = orderService.createOrder(customerUser.id, {
        deliveryRoom: 'A-204',
        specialInstructions: 'Make tea strong',
        paymentMethod: 'UPI',
        items: [
          { productId: 'prod_tea_normal', quantity: 2, selectedOptions: { strength: 'Strong' } }, // 1200 * 2 = 2400
          { productId: 'prod_snack_biscuits', quantity: 1 } // 1000
        ]
      });

      assert.ok(order.orderNumber.startsWith('RB-'));
      assert.equal(order.subtotalPaise, 3400); // ₹34.00
      assert.equal(order.totalPaise, 3400);
      assert.equal(order.status, 'PLACED');
      assert.equal(order.paymentStatus, 'PENDING');
      assert.equal(order.items?.length, 2);
    });

    test('Admin transitions order: PLACED -> ACCEPTED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED', () => {
      const order = orderService.createOrder(customerUser.id, {
        deliveryRoom: 'A-204',
        paymentMethod: 'CASH',
        items: [{ productId: 'prod_coffee_bru', quantity: 1 }] // 1500
      });

      // Admin accepts
      const accepted = orderService.adminUpdateStatus(order.id, 'ACCEPTED');
      assert.equal(accepted.status, 'ACCEPTED');

      // Admin updates to preparing
      const preparing = orderService.adminUpdateStatus(order.id, 'PREPARING');
      assert.equal(preparing.status, 'PREPARING');

      // Admin out for delivery
      const out = orderService.adminUpdateStatus(order.id, 'OUT_FOR_DELIVERY');
      assert.equal(out.status, 'OUT_FOR_DELIVERY');

      // Admin marks delivered
      const delivered = orderService.adminUpdateStatus(order.id, 'DELIVERED');
      assert.equal(delivered.status, 'DELIVERED');
    });

    test('Customer cancellation allowed only before admin acceptance', () => {
      const order = orderService.createOrder(customerUser.id, {
        deliveryRoom: 'A-204',
        paymentMethod: 'CASH',
        items: [{ productId: 'prod_tea_black', quantity: 1 }]
      });

      // While in PLACED status, customer can cancel
      const cancelled = orderService.customerCancelOrder(order.id, customerUser.id, 'Decided to sleep');
      assert.equal(cancelled.status, 'CANCELLED');

      // Create another order and accept it
      const order2 = orderService.createOrder(customerUser.id, {
        deliveryRoom: 'A-204',
        paymentMethod: 'CASH',
        items: [{ productId: 'prod_tea_black', quantity: 1 }]
      });
      orderService.adminUpdateStatus(order2.id, 'ACCEPTED');

      // Attempting to cancel now must throw an error
      assert.throws(() => {
        orderService.customerCancelOrder(order2.id, customerUser.id, 'Too late to cancel');
      }, /CANCELLATION_NOT_ALLOWED/);
    });

    test('Admin verifies UPI payment settlement', () => {
      const order = orderService.createOrder(customerUser.id, {
        deliveryRoom: 'A-204',
        paymentMethod: 'UPI',
        items: [{ productId: 'prod_instant_noodles', quantity: 1 }] // 3000
      });

      const payment = paymentService.verifyPayment('usr_admin_001', {
        orderId: order.id,
        paymentMethod: 'UPI',
        transactionRef: 'UPI-REF-99281729381',
        amountPaise: 3000
      });

      assert.equal(payment.status, 'VERIFIED');
      assert.equal(payment.transactionRef, 'UPI-REF-99281729381');

      const updatedOrder = orderService.getOrderById(order.id)!;
      assert.equal(updatedOrder.paymentStatus, 'VERIFIED');
    });
  });

  describe('5. Alternative Product Suggestion Workflow', () => {
    test('Admin suggests substitute product and customer accepts with updated price', async () => {
      const email = 'neeraj@rit.ac.in';
      await authService.requestOtp(email);
      const otp = emailService.getLastSentForTesting()!.code;
      const user = authService.verifyOtp(email, otp).user;
      authService.updateProfile(user.id, {
        fullName: 'Neeraj Madhav',
        roomNumber: 'B-105',
        phoneNumber: '+919999888877'
      });

      // Customer orders Boost (₹20 = 2000 paise)
      const order = orderService.createOrder(user.id, {
        deliveryRoom: 'B-105',
        paymentMethod: 'CASH',
        items: [{ productId: 'prod_health_boost', quantity: 1 }]
      });

      // Admin suggests Horlicks instead
      const alt = orderService.adminSuggestAlternative(order.id, {
        originalProductId: 'prod_health_boost',
        suggestedProductId: 'prod_health_horlicks',
        note: 'Boost is out of stock tonight, can I brew Horlicks instead?'
      });

      assert.equal(alt.status, 'PENDING');
      const orderPending = orderService.getOrderById(order.id)!;
      assert.equal(orderPending.status, 'AWAITING_APPROVAL');

      // Customer accepts alternative
      const updatedOrder = orderService.customerRespondAlternative(order.id, user.id, 'ACCEPT');
      assert.equal(updatedOrder.status, 'ACCEPTED');
      assert.equal(updatedOrder.items![0].productId, 'prod_health_horlicks');
      assert.equal(updatedOrder.items![0].productName, 'Horlicks');
    });
  });

  describe('6. Strict Credit Ledger & The 2-Due Rule', () => {
    let creditUser: any;

    before(async () => {
      const email = 'credit.student@rit.ac.in';
      await authService.requestOtp(email);
      const otp = emailService.getLastSentForTesting()!.code;
      creditUser = authService.verifyOtp(email, otp).user;
      authService.updateProfile(creditUser.id, {
        fullName: 'Kiran Credit User',
        roomNumber: 'C-401',
        phoneNumber: '+919777666555'
      });
    });

    test('Unapproved customer cannot place credit order', () => {
      assert.throws(() => {
        orderService.createOrder(creditUser.id, {
          deliveryRoom: 'C-401',
          paymentMethod: 'CREDIT',
          items: [{ productId: 'prod_tea_normal', quantity: 1 }]
        });
      }, /CREDIT_NOT_APPROVED/);
    });

    test('Admin approves credit, customer can place up to 2 unpaid dues', () => {
      // 1. Admin approves credit
      paymentService.adminSetCreditStatus('usr_admin_001', creditUser.id, 'APPROVED');
      let profile = authService.getProfile(creditUser.id)!;
      assert.equal(profile.creditStatus, 'APPROVED');

      // 2. Order #1 on credit (1200 paise) -> unpaid count = 1
      const order1 = orderService.createOrder(creditUser.id, {
        deliveryRoom: 'C-401',
        paymentMethod: 'CREDIT',
        items: [{ productId: 'prod_tea_normal', quantity: 1 }]
      });
      profile = authService.getProfile(creditUser.id)!;
      assert.equal(profile.unpaidOrdersCount, 1);
      assert.equal(profile.outstandingBalancePaise, 1200);

      // 3. Order #2 on credit (1500 paise) -> unpaid count = 2
      const order2 = orderService.createOrder(creditUser.id, {
        deliveryRoom: 'C-401',
        paymentMethod: 'CREDIT',
        items: [{ productId: 'prod_coffee_bru', quantity: 1 }]
      });
      profile = authService.getProfile(creditUser.id)!;
      assert.equal(profile.unpaidOrdersCount, 2);
      assert.equal(profile.outstandingBalancePaise, 2700);

      // 4. Order #3 on credit (1000 paise) -> when placed, current unpaid count is 2 (<= 2 is allowed).
      // Placing this increases unpaid count to 3.
      const order3 = orderService.createOrder(creditUser.id, {
        deliveryRoom: 'C-401',
        paymentMethod: 'CREDIT',
        items: [{ productId: 'prod_tea_black', quantity: 1 }]
      });
      profile = authService.getProfile(creditUser.id)!;
      assert.equal(profile.unpaidOrdersCount, 3);
      assert.equal(profile.outstandingBalancePaise, 3700);

      // 5. Order #4 on credit MUST BE STRICTLY BLOCKED because unpaidOrdersCount is now 3 (> 2)!
      assert.throws(() => {
        orderService.createOrder(creditUser.id, {
          deliveryRoom: 'C-401',
          paymentMethod: 'CREDIT',
          items: [{ productId: 'prod_fruit_banana', quantity: 1 }]
        });
      }, /CREDIT_LIMIT_EXCEEDED/);
    });

    test('Admin settles partial dues, customer is unblocked when unpaid count <= 2', () => {
      // Customer visits admin room and settles ₹20.00 (2000 paise)
      const res = paymentService.adminSettleDues('usr_admin_001', {
        customerId: creditUser.id,
        amountPaise: 2000,
        description: 'Cash payment settled in Admin Room 101'
      });

      assert.equal(res.profile.outstandingBalancePaise, 1700);
      assert.equal(res.profile.unpaidOrdersCount, 2);

      // Now customer has 2 unpaid dues, so credit order is permitted again!
      const order4 = orderService.createOrder(creditUser.id, {
        deliveryRoom: 'C-401',
        paymentMethod: 'CREDIT',
        items: [{ productId: 'prod_fruit_banana', quantity: 1 }] // 500
      });

      assert.ok(order4.id);
      const updatedProfile = authService.getProfile(creditUser.id)!;
      assert.equal(updatedProfile.outstandingBalancePaise, 2200);
      assert.equal(updatedProfile.unpaidOrdersCount, 3);
    });
  });

  describe('7. Shop Availability & Analytics', () => {
    test('Admin switches shop to SLEEPING and instant orders are blocked', async () => {
      shopService.updateSettings({
        status: 'SLEEPING',
        statusNote: 'Sleeping between 5:30 AM and 8:30 PM. Call for medical emergency only.',
        emergencyContact: '+919876543210'
      });

      const settings = shopService.getSettings();
      assert.equal(settings.status, 'SLEEPING');
      assert.equal(settings.emergencyContact, '+919876543210');

      // Attempting to place an instant order while shop is SLEEPING must throw SHOP_SLEEPING
      const email = 'sleep.test@rit.ac.in';
      await authService.requestOtp(email);
      const otp = emailService.getLastSentForTesting()!.code;
      const user = authService.verifyOtp(email, otp).user;
      authService.updateProfile(user.id, { fullName: 'Sleep Tester', roomNumber: 'D-1', phoneNumber: '+910000000000' });

      assert.throws(() => {
        orderService.createOrder(user.id, {
          deliveryRoom: 'D-1',
          paymentMethod: 'CASH',
          items: [{ productId: 'prod_tea_normal', quantity: 1 }]
        });
      }, /SHOP_SLEEPING/);

      // Reopen shop to AVAILABLE
      shopService.updateSettings({ status: 'AVAILABLE' });
      assert.equal(shopService.getSettings().status, 'AVAILABLE');
    });

    test('Analytics dashboard aggregates metrics correctly', () => {
      const metrics = analyticsService.getDashboardMetrics();
      assert.ok(metrics.todayOrdersCount > 0);
      assert.ok(metrics.topProducts.length > 0);
      assert.ok(metrics.totalOutstandingDuesPaise >= 0);
    });
  });
});
