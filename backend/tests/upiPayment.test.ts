import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatPaiseToRupees, isValidVpa, buildUpiUri } from '../src/utils/upi.js';
import { ShopService } from '../src/services/shopService.js';
import { PaymentService } from '../src/services/paymentService.js';
import { OrderService } from '../src/services/orderService.js';

describe('RoomBites Authoritative UPI Payment Integration Test Suite', () => {
  describe('1. Amount Precision & Paise-to-Rupee Conversion (Zero Rounding Errors)', () => {
    it('formats ₹1 (100 paise) as exactly "1.00"', () => {
      assert.strictEqual(formatPaiseToRupees(100), '1.00');
    });

    it('formats ₹2 (200 paise) as exactly "2.00"', () => {
      assert.strictEqual(formatPaiseToRupees(200), '2.00');
    });

    it('formats ₹12 (1200 paise) as exactly "12.00"', () => {
      assert.strictEqual(formatPaiseToRupees(1200), '12.00');
    });

    it('formats ₹32 (3200 paise) as exactly "32.00" (Order RB-20261116-001 target)', () => {
      assert.strictEqual(formatPaiseToRupees(3200), '32.00');
    });

    it('formats ₹99.50 (9950 paise) as exactly "99.50"', () => {
      assert.strictEqual(formatPaiseToRupees(9950), '99.50');
    });

    it('formats ₹100 (10000 paise) as exactly "100.00"', () => {
      assert.strictEqual(formatPaiseToRupees(10000), '100.00');
    });

    it('formats large amounts e.g. ₹5000.50 (500050 paise) as "5000.50"', () => {
      assert.strictEqual(formatPaiseToRupees(500050), '5000.50');
    });

    it('formats ₹0.01 (1 paisa) as "0.01"', () => {
      assert.strictEqual(formatPaiseToRupees(1), '0.01');
    });

    it('rejects zero amount (0 paise)', () => {
      assert.throws(() => formatPaiseToRupees(0), /INVALID_AMOUNT/);
    });

    it('rejects negative amounts', () => {
      assert.throws(() => formatPaiseToRupees(-500), /INVALID_AMOUNT/);
    });

    it('rejects NaN or non-numeric amounts', () => {
      assert.throws(() => formatPaiseToRupees(NaN), /INVALID_AMOUNT/);
      assert.throws(() => formatPaiseToRupees(undefined as any), /INVALID_AMOUNT/);
    });
  });

  describe('2. Recipient VPA Format Validation', () => {
    it('accepts valid official ICICI bank VPA (anikumaricmani-1@okicici)', () => {
      assert.strictEqual(isValidVpa('anikumaricmani-1@okicici'), true);
    });

    it('accepts standard handles: gpay, paytm, ybl, okhdfcbank, ibl, sbi', () => {
      assert.strictEqual(isValidVpa('student@paytm'), true);
      assert.strictEqual(isValidVpa('hostelmess@ybl'), true);
      assert.strictEqual(isValidVpa('user.name_12@okhdfcbank'), true);
      assert.strictEqual(isValidVpa('karthik-228@sbi'), true);
    });

    it('rejects malformed VPAs without @ or invalid characters', () => {
      assert.strictEqual(isValidVpa(''), false);
      assert.strictEqual(isValidVpa('plainphone9847837607'), false);
      assert.strictEqual(isValidVpa('@okicici'), false);
      assert.strictEqual(isValidVpa('user@'), false);
      assert.strictEqual(isValidVpa('user name@bank'), false);
    });
  });

  describe('3. NPCI Standards-Compliant UPI Intent URI Construction', () => {
    it('constructs authoritative UPI URI for ₹32 order with unescaped @ in pa and valid two-decimal amount', () => {
      const uri = buildUpiUri({
        vpa: 'anikumaricmani-1@okicici',
        payeeName: 'Karthik C Mani',
        amountPaise: 3200,
        orderNumber: 'RB-20261116-001'
      });

      assert.ok(uri.startsWith('upi://pay?'), 'Must start with upi://pay?');
      assert.ok(uri.includes('pa=anikumaricmani-1@okicici'), 'Recipient VPA must retain @ without %40');
      assert.ok(uri.includes('pn=Karthik%20C%20Mani'), 'Payee name must be URL encoded');
      assert.ok(uri.includes('am=32.00'), 'Amount must be exactly 32.00');
      assert.ok(uri.includes('cu=INR'), 'Currency must be INR');
      assert.ok(uri.includes('tn=RoomBites%20Order%20RB-20261116-001'), 'Transaction note must include sanitized order number');
      assert.ok(uri.includes('tr=RB-20261116-001'), 'Unique order reference must be included');
    });

    it('rejects building UPI URI when payee name is empty', () => {
      assert.throws(() => buildUpiUri({
        vpa: 'anikumaricmani-1@okicici',
        payeeName: '',
        amountPaise: 3200,
        orderNumber: 'RB-001'
      }), /INVALID_PAYEE_NAME/);
    });

    it('rejects building UPI URI when recipient VPA is invalid', () => {
      assert.throws(() => buildUpiUri({
        vpa: 'invalid-vpa-no-at',
        payeeName: 'Karthik C Mani',
        amountPaise: 3200,
        orderNumber: 'RB-001'
      }), /INVALID_RECIPIENT_VPA/);
    });
  });

  describe('4. Centralized Seller Payment Configuration & Validation', () => {
    const shopService = new ShopService();

    it('retrieves configured seller UPI details', () => {
      const settings = shopService.getSettings();
      assert.strictEqual(settings.upiId, 'anikumaricmani-1@okicici');
      assert.ok(settings.upiName && settings.upiName.length > 0);
    });

    it('rejects setting an invalid UPI ID in shop settings', () => {
      assert.throws(() => {
        shopService.updateSettings({
          upiId: 'not-an-email-or-upi'
        });
      }, /INVALID_UPI_ID/);
    });

    it('rejects setting an empty payee name in shop settings', () => {
      assert.throws(() => {
        shopService.updateSettings({
          upiName: '   '
        });
      }, /INVALID_UPI_NAME/);
    });
  });

  describe('5. Zero-Trust Payment Lifecycle & UTR Submission Workflow', () => {
    const orderService = new OrderService();
    const paymentService = new PaymentService();

    it('keeps order in PENDING status upon UTR submission until administrative verification', () => {
      // 1. Fetch existing order or create test order
      const orders = orderService.getOrdersAdmin();
      const testOrder = orders.find(o => o.paymentMethod === 'UPI' && o.paymentStatus === 'PENDING') || orders[0];
      assert.ok(testOrder, 'Must have at least one test order');

      // 2. Submit customer UTR reference
      const utrResult = paymentService.submitUtr(testOrder.customerId, testOrder.id, '432190821001');
      assert.strictEqual(utrResult.transactionRef, '432190821001');

      // 3. Confirm order status has NOT automatically become VERIFIED
      const updatedOrder = orderService.getOrderById(testOrder.id);
      assert.strictEqual(updatedOrder?.paymentStatus, 'PENDING', 'Payment must remain PENDING until admin verifies');
      assert.strictEqual(updatedOrder?.transactionRef, '432190821001');

      // 4. Admin independently verifies payment with reference
      const paymentRecord = paymentService.verifyPayment('usr_admin_roombites', {
        orderId: testOrder.id,
        paymentMethod: 'UPI',
        transactionRef: '432190821001',
        amountPaise: testOrder.totalPaise
      });

      assert.strictEqual(paymentRecord.status, 'VERIFIED');
      assert.strictEqual(paymentRecord.transactionRef, '432190821001');

      // 5. Order is now verified
      const verifiedOrder = orderService.getOrderById(testOrder.id);
      assert.strictEqual(verifiedOrder?.paymentStatus, 'VERIFIED');
    });
  });
});
