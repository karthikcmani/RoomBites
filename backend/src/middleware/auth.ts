import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRole } from '../types/index.js';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  roomNumber?: string;
  fullName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'roombites_dev_secret_key_change_in_production_32_chars';

export function signToken(user: AuthUser, expiresIn: SignOptions['expiresIn'] = '7d'): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function isValidRitEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.trim().toLowerCase();
  // Validates standard institutional pattern: student@rit.ac.in or subdomains
  return /^[a-zA-Z0-9._%+-]+@rit\.ac\.in$/i.test(cleanEmail);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid authentication token.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Session token has expired or is invalid.' });
  }

  req.user = decoded;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Forbidden: Administrative access required.' });
  }

  next();
}
