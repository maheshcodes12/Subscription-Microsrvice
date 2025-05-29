const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, registerSchema, loginSchema } = require('../validation/schemas');
const authService = require('../services/authService');

const router = express.Router();

// Register new user
router.post('/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    
    const result = await authService.register({ name, email, password, role });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        token: result.token
      }
    });
  })
);

// Login user
router.post('/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    const result = await authService.login(email, password);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        token: result.token
      }
    });
  })
);

module.exports = router;