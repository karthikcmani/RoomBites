import { Router, Request, Response } from 'express';
import { ProductService } from '../services/productService.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { WebSocketBroker } from '../websocket/server.js';

const router = Router();
const productService = new ProductService();

// Public: Get Categories
router.get('/categories', (_req: Request, res: Response) => {
  try {
    const categories = productService.getCategories();
    res.json({ success: true, categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public: Get Active Products Menu
router.get('/', (req: Request, res: Response) => {
  try {
    const categoryId = req.query.category as string | undefined;
    const products = productService.getProducts(categoryId);
    res.json({ success: true, products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public: Get Product by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const product = productService.getProductById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found.' });
    res.json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Get all products (including unavailable)
router.get('/admin/all', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  try {
    const products = productService.getAllProductsAdmin();
    res.json({ success: true, products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Create Product
router.post('/', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, categoryId, description, pricePaise, stockStatus, hasCustomization, customizationSchema } = req.body;
    if (!name || !categoryId || pricePaise === undefined) {
      return res.status(400).json({ success: false, error: 'Name, category, and price are required.' });
    }
    const product = productService.createProduct({
      name,
      categoryId,
      description,
      pricePaise: Number(pricePaise),
      stockStatus,
      hasCustomization: Boolean(hasCustomization),
      customizationSchema
    });
    WebSocketBroker.getInstance().broadcastAll({
      type: 'PRODUCT_UPDATED',
      payload: { product }
    });
    res.status(201).json({ success: true, product });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: Update Product
router.patch('/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const product = productService.updateProduct(req.params.id, req.body);
    WebSocketBroker.getInstance().broadcastAll({
      type: 'PRODUCT_UPDATED',
      payload: { product }
    });
    res.json({ success: true, product });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: Fast Toggle Availability
router.patch('/:id/availability', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { isAvailable } = req.body;
    const product = productService.toggleAvailability(req.params.id, Boolean(isAvailable));
    WebSocketBroker.getInstance().broadcastAll({
      type: 'PRODUCT_UPDATED',
      payload: { product }
    });
    res.json({ success: true, product });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: Fast Update Stock
router.patch('/:id/stock', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { stockStatus } = req.body;
    const product = productService.updateStockStatus(req.params.id, stockStatus);
    WebSocketBroker.getInstance().broadcastAll({
      type: 'PRODUCT_UPDATED',
      payload: { product }
    });
    res.json({ success: true, product });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
