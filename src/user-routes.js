const express = require('express');
const router = express.Router();
const userService = require('./user-service');
const { authenticateToken, verifyAdmin } = require('../utils/auth');

// Get user profile
router.get('/get-user-profile', authenticateToken, userService.getUserData);

// Get unverified users (admin only)
router.get('/unverified-users', authenticateToken, verifyAdmin, userService.getUnverifiedUser);

module.exports = router; 