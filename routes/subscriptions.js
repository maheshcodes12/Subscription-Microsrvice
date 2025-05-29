const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, createSubscriptionSchema, updateSubscriptionSchema } = require('../validation/schemas');
const subscriptionService = require('../services/subscriptionService');

const router = express.Router();

// Create subscription
router.post('/', 
  authenticateToken,
  validate(createSubscriptionSchema),
  asyncHandler(async (req, res) => {
    const { userId, planId, autoRenew } = req.body;
    
    const subscription = await subscriptionService.createSubscription(userId, planId, {
      autoRenew,
      
    });

    res.status(201).json({
      success: true,
      data: subscription
    });
  })
);

// Get user subscription
router.get('/:userId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const subscription = await subscriptionService.getSubscription(userId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No subscription found'
      });
    }

    res.json({
      success: true,
      data: subscription
    });
  })
);

// Update subscription
router.put('/:userId',
  authenticateToken,
  validate(updateSubscriptionSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const updates = req.body;
    
    const subscription = await subscriptionService.updateSubscription(userId, updates);

    res.json({
      success: true,
      data: subscription
    });
  })
);

// Cancel subscription
router.delete('/:userId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const subscription = await subscriptionService.cancelSubscription(userId);

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription
    });
  })
);

module.exports = router;