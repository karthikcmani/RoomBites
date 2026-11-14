import http from 'node:http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import { WebSocketBroker } from './websocket/server.js';
import { runSeed } from './db/seed.js';
import { getJwtSecret, getOtpPepper } from './middleware/auth.js';

dotenv.config();

// Production Security Validation: Fail fast on startup if secrets are insecure
try {
  getJwtSecret();
  getOtpPepper();
} catch (err: any) {
  console.error('[RoomBites Security Error]', err.message);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || '*';

// Middleware
app.use(cors({
  origin: CLIENT_URL === '*' ? '*' : [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/shop', shopRoutes);

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'RoomBites Backend Engine',
    version: '1.0.0'
  });
});

// Seed Initial Catalog and Admin
try {
  runSeed();
} catch (err) {
  console.error('[RoomBites] Seed initialization error:', err);
}

// Create HTTP and WebSocket server
const server = http.createServer(app);
WebSocketBroker.getInstance().init(server);

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` RoomBites Backend API running on port ${PORT}`);
  console.log(` Health endpoint: http://localhost:${PORT}/health`);
  console.log(` WebSocket server: ws://localhost:${PORT}/ws`);
  console.log(`===============================================`);
});

export { app, server };
