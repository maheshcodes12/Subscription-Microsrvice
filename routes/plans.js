const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, createPlanSchema, updatePlanSchema } = require('../validation/schemas');
const Plan = require('../models/Plan');
const redisService = require('../services/redis');

const router = express.Router();

// Get all plans
router.get('/',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, active } = req.query;
    const cacheKey = `plans:all:${page}:${limit}:${active}`;
    
    // Try cache first
    let result = await redisService.get(cacheKey);
    
    if (!result) {
      const filter = {};
      if (active !== undefined) {
        filter.isActive = active === 'true';
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const plans = await Plan.find(filter)
        .sort({ price: 1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Plan.countDocuments(filter);
      
      result = {
        plans,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      };

      await redisService.set(cacheKey, result, 600); 
    }

    res.json({
      success: true,
      data: result.plans,
      pagination: result.pagination
    });
  })
);

// Get single plan
router.get('/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const cacheKey = `plan:${id}`;
    
    let plan = await redisService.get(cacheKey);
    
    if (!plan) {
      plan = await Plan.findById(id);
      if (plan) {
        await redisService.set(cacheKey, plan, 600);
      }
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    res.json({
      success: true,
      data: plan
    });
  })
);

// Create plan (admin only)
router.post('/',
  authenticateToken,
  validate(createPlanSchema),
  asyncHandler(async (req, res) => {
    const planData = req.body;
    
    // Check if plan with same name exists
    const existingPlan = await Plan.findOne({ name: planData.name });
    if (existingPlan) {
      return res.status(400).json({
        success: false,
        error: 'Plan with this name already exists'
      });
    }

    const plan = new Plan(planData);
    await plan.save();

    // Clear relevant caches
    await redisService.del('plans:all:1:10:undefined');
    await redisService.del('plans:all:1:10:true');

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Plan created successfully'
    });
  })
);

// Update plan (admin only)
router.put('/:id',
  authenticateToken,
  validate(updatePlanSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if updating name to an existing one
    if (updates.name) {
      const existingPlan = await Plan.findOne({ 
        name: updates.name, 
        _id: { $ne: id } 
      });
      if (existingPlan) {
        return res.status(400).json({
          success: false,
          error: 'Plan with this name already exists'
        });
      }
    }

    const plan = await Plan.findByIdAndUpdate(id, updates, { 
      new: true, 
      runValidators: true 
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    // Clear caches
    await redisService.del('plans:all:1:10:undefined');
    await redisService.del('plans:all:1:10:true');
    await redisService.del('plans:all:1:10:false');
    await redisService.del(`plan:${id}`);

    res.json({
      success: true,
      data: plan,
      message: 'Plan updated successfully'
    });
  })
);

// Delete plan (soft delete - set inactive)
router.delete('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const plan = await Plan.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    // Clear caches
    await redisService.del('plans:all:1:10:undefined');
    await redisService.del('plans:all:1:10:true');
    await redisService.del('plans:all:1:10:false');
    await redisService.del(`plan:${id}`);

    res.json({
      success: true,
      message: 'Plan deactivated successfully',
      data: plan
    });
  })
);

// Activate plan (admin only)
router.patch('/:id/activate',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const plan = await Plan.findByIdAndUpdate(id, { isActive: true }, { new: true });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    // Clear caches
    await redisService.del('plans:all:1:10:undefined');
    await redisService.del('plans:all:1:10:true');
    await redisService.del(`plan:${id}`);

    res.json({
      success: true,
      message: 'Plan activated successfully',
      data: plan
    });
  })
);

// Get plan statistics (admin only)
router.get('/stats/overview',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const cacheKey = 'plans:stats';
    
    let stats = await redisService.get(cacheKey);
    
    if (!stats) {
      const totalPlans = await Plan.countDocuments();
      const activePlans = await Plan.countDocuments({ isActive: true });
      const inactivePlans = totalPlans - activePlans;
      
      const priceStats = await Plan.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' }
          }
        }
      ]);

      stats = {
        totalPlans,
        activePlans,
        inactivePlans,
        pricing: priceStats[0] || { avgPrice: 0, minPrice: 0, maxPrice: 0 }
      };

      await redisService.set(cacheKey, stats, 300); 
    }

    res.json({
      success: true,
      data: stats
    });
  })
);

module.exports = router;