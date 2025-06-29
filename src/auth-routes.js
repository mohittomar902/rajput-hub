const express = require('express');
const router = express.Router();
const userService = require('./user-service');
const { userRequiredParameters, loginRequiredParameters } = require('../utils/constant');
const { getdataValidationMiddleware } = require('../utils/dataValidation');
const { authenticateToken, verifyAdmin } = require('../utils/auth');

// Login
router.post('/login', getdataValidationMiddleware(loginRequiredParameters), userService.login);

// Register
router.post('/register',
  getdataValidationMiddleware(userRequiredParameters),
  userService.checkIsUserAlreadyExist,
  userService.registerUser
);

// Verify user (admin only)
router.post('/verifyUsers', authenticateToken, verifyAdmin, userService.verifyEmailAndPhone);

module.exports = router; 