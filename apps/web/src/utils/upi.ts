/**
 * RoomBites UPI Payment & Standards Integration Utility
 * Strictly conforms to NPCI UPI Linking Specifications and IEEE 754 precision rules.
 */

export interface UpiPaymentParams {
  vpa: string;          // pa: Payee VPA / UPI ID
  payeeName: string;    // pn: Payee Name on Bank Account
  amountPaise: number;  // am: Amount in integer paise (e.g. 3200 for ₹32.00)
  orderNumber: string;  // tr: Unique Order Reference
  note?: string;        // tn: Transaction Note / Description
  app?: 'gpay' | 'phonepe' | 'paytm' | 'bhim';
}

/**
 * Standard NPCI-compliant VPA validation regex.
 * Format: user@bank (2-256 chars before @, 2-64 chars after @).
 */
export const VPA_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

/**
 * Converts integer paise into an exact two-decimal rupee string without floating point errors.
 * Example: 3200 -> "32.00", 9950 -> "99.50", 100 -> "1.00", 200 -> "2.00"
 */
export function formatPaiseToRupees(amountPaise: number): string {
  if (typeof amountPaise !== 'number' || isNaN(amountPaise)) {
    throw new Error('INVALID_AMOUNT: Amount in paise must be a valid number.');
  }

  const roundedPaise = Math.round(amountPaise);
  if (roundedPaise <= 0) {
    throw new Error('INVALID_AMOUNT: Amount in paise must be strictly positive.');
  }

  const whole = Math.floor(roundedPaise / 100);
  const frac = roundedPaise % 100;
  return `${whole}.${frac.toString().padStart(2, '0')}`;
}

/**
 * Validates whether a given string is a valid UPI VPA.
 */
export function isValidVpa(vpa: string): boolean {
  if (!vpa || typeof vpa !== 'string') return false;
  return VPA_REGEX.test(vpa.trim());
}

/**
 * Builds an authoritative, standards-compliant NPCI UPI payment intent URI.
 * Query format: upi://pay?pa=...&pn=...&am=32.00&cu=INR&tn=...&tr=...
 */
export function buildUpiUri(params: UpiPaymentParams): string {
  const vpa = params.vpa?.trim();
  if (!isValidVpa(vpa)) {
    throw new Error(`INVALID_RECIPIENT_VPA: "${vpa}" is not a valid recipient UPI ID.`);
  }

  const payeeName = params.payeeName?.trim();
  if (!payeeName) {
    throw new Error('INVALID_PAYEE_NAME: Payee name cannot be empty.');
  }

  const amountRupees = formatPaiseToRupees(params.amountPaise);

  // Clean order reference to alphanumeric and safe characters
  const cleanRef = (params.orderNumber || '').replace(/[^A-Za-z0-9_-]/g, '');
  if (!cleanRef) {
    throw new Error('INVALID_ORDER_REFERENCE: Order reference cannot be empty.');
  }

  const note = params.note?.trim() || `RoomBites Order ${cleanRef}`;

  // Keep @ unescaped in pa for UPI app parser compatibility per RFC 3986 query grammar
  const queryParts = [
    `pa=${vpa}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${amountRupees}`,
    `cu=INR`,
    `tn=${encodeURIComponent(note)}`,
    `tr=${encodeURIComponent(cleanRef)}`
  ];

  if (params.app) {
    queryParts.push(`app=${encodeURIComponent(params.app)}`);
  }

  return `upi://pay?${queryParts.join('&')}`;
}

/**
 * Builds a clean NPCI UPI URI specifically for offline dynamic QR code rendering.
 * Never includes internal application routing flags.
 */
export function buildUpiQrString(params: Omit<UpiPaymentParams, 'app'>): string {
  return buildUpiUri(params);
}
