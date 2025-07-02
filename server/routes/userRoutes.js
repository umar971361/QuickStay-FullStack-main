import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getUserData, storeRecentSearchedCities } from '../controllers/userController.js';

const router = express.Router();

// Add logging middleware for debugging
router.use((req, res, next) => {
  console.log(`🌐 User route: ${req.method} ${req.path}`);
  next();
});

// Routes
router.get('/', protect, getUserData);
router.post('/recent-searched-cities', protect, storeRecentSearchedCities);

export default router;