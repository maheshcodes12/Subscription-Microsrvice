const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const redisService = require('./redis');

class SubscriptionService {
  
  async createSubscription(userId, planId, options = {}) {
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      throw new Error('Plan not found or inactive');
    }

    // Cancel existing active subscription
    await this.cancelUserSubscription(userId);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    const subscription = new Subscription({
      userId,
      planId,
      endDate,
      autoRenew: options.autoRenew || false,
    });

    await subscription.save();
    await subscription.populate('planId');

    // Publish event
    await redisService.publish('subscription.created', {
      userId,
      planId,
      subscriptionId: subscription._id
    });

    // Cache the subscription
    await this.cacheUserSubscription(userId, subscription);

    return subscription;
  }

  async getSubscription(userId) {
    // Try cache first
    let subscription = await this.getCachedSubscription(userId);
    
    if (!subscription) {
      subscription = await Subscription.findOne({ 
        userId, 
        status: { $in: ['ACTIVE', 'EXPIRED'] } 
      })
      .populate('planId')
      .sort({ createdAt: -1 });

      if (subscription) {
        await this.cacheUserSubscription(userId, subscription);
      }
    }

    // // Check if expired and update status
    // if (subscription && subscription.isExpired() && subscription.status === 'ACTIVE') {
    //   await this.expireSubscription(subscription._id);
    //   subscription.status = 'EXPIRED';
    // }

    return subscription;
  }

  async updateSubscription(userId, updates) {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (updates.planId) {
      const plan = await Plan.findById(updates.planId);
      if (!plan || !plan.isActive) {
        throw new Error('Plan not found or inactive');
      }

      // Recalculate end date if plan changed
      const remainingDays = Math.ceil((subscription.endDate - new Date()) / (1000 * 60 * 60 * 24));
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + plan.duration);
      
      updates.endDate = newEndDate;
    }

    Object.assign(subscription, updates);
    await subscription.save();
    await subscription.populate('planId');

    // Update cache
    await this.cacheUserSubscription(userId, subscription);

    // Publish event
    await redisService.publish('subscription.updated', {
      userId,
      subscriptionId: subscription._id,
      updates
    });

    return subscription;
  }

  async cancelSubscription(userId) {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) {
      throw new Error('No active subscription to cancel');
    }

    subscription.status = 'CANCELLED';
    await subscription.save();

    // Clear cache
    await redisService.del(`subscription:${userId}`);

    // Publish event
    await redisService.publish('subscription.cancelled', {
      userId,
      subscriptionId: subscription._id
    });

    return subscription;
  }

  async getActiveSubscription(userId) {
    return await Subscription.findOne({ 
      userId, 
      status: 'ACTIVE' 
    }).populate('planId');
  }

  async cancelUserSubscription(userId) {
    await Subscription.updateMany(
      { userId, status: 'ACTIVE' },
      { status: 'CANCELLED' }
    );
    await redisService.del(`subscription:${userId}`);
  }

  async expireSubscription(subscriptionId) {
    const subscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { status: 'EXPIRED' },
      { new: true }
    );

    if (subscription) {
      await redisService.del(`subscription:${subscription.userId}`);
      
      await redisService.publish('subscription.expired', {
        userId: subscription.userId,
        subscriptionId: subscription._id
      });
    }

    return subscription;
  }

  async processExpiredSubscriptions() {
    const expiredSubs = await Subscription.find({
      status: 'ACTIVE',
      endDate: { $lt: new Date() }
    });

    const results = [];
    for (const sub of expiredSubs) {
      try {
        await this.expireSubscription(sub._id);
        results.push({ id: sub._id, status: 'expired' });
      } catch (error) {
        results.push({ id: sub._id, status: 'error', error: error.message });
      }
    }

    return results;
  }

  // Cache helpers
  async cacheUserSubscription(userId, subscription) {
    const cacheKey = `subscription:${userId}`;
    await redisService.set(cacheKey, subscription, 300); 
  }

  async getCachedSubscription(userId) {
    const cacheKey = `subscription:${userId}`;
    return await redisService.get(cacheKey);
  }
}

module.exports = new SubscriptionService();