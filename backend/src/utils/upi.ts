/**
 * RoomBites Backend UPI Utility & Validation
 */

export interface UpiPaymentParams {
  vpa: string;
  payeeName: string;
  amountPaise: number;
  orderNumber: string;
  note?: string;
}

export const VPA_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

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

export function isValidVpa(vpa: string): boolean {
  if (!vpa || typeof vpa !== 'string') return false;
  return VPA_REGEX.test(vpa.trim());
}

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
  const cleanRef = (params.orderNumber || '').replace(/[^A-Za-z0-9_-]/g, '');
  if (!cleanRef) {
    throw new Error('INVALID_ORDER_REFERENCE: Order reference cannot be empty.');
  }

  const note = params.note?.trim() || `RoomBites Order ${cleanRef}`;

  return `upi://pay?pa=${vpa}&pn=${encodeURIComponent(payeeName)}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(note)}&tr=${encodeURIComponent(cleanRef)}`;
}
