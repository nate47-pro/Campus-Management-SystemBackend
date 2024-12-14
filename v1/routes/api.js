const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public routes
router.post('/auth/login', authController.login);

// Protected routes for all authenticated users
router.get('/events', authenticateToken, eventController.getAllEvents);

// Admin-only routes
router.post('/events', authenticateToken, requireAdmin, eventController.createEvent);
router.put('/events/:id', authenticateToken, requireAdmin, eventController.updateEvent);
router.delete('/events/:id', authenticateToken, requireAdmin, eventController.deleteEvent); 