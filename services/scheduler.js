const cron = require('node-cron');
const subscriptionService = require('./subscriptionService');
const redisService = require('./redis');

const startScheduler = async () => {
  try {
    await redisService.connect();
    
    // Run every hour to check for expired subscriptions
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('Running subscription expiry check');
        const results = await subscriptionService.processExpiredSubscriptions();
        console.log(`Processed ${results.length} expired subscriptions`);
      } catch (error) {
        console.error('Error processing expired subscriptions:', error);
      }
    });

    // Health check job every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await redisService.set('health:check', { timestamp: new Date() }, 60);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    });

    console.log('Scheduler started successfully');

    // Subscribe to events
    await setupEventListeners();

  } catch (error) {
    console.error('Failed to start scheduler:', error);
  }
};

const setupEventListeners = async () => {
  // Listen for subscription events
  await redisService.subscribe('subscription.created', (data) => {
    console.log('Subscription created:', data);
    
  });

  await redisService.subscribe('subscription.cancelled', (data) => {
    console.log('Subscription cancelled:', data);
    
  });

  await redisService.subscribe('subscription.expired', (data) => {
    console.log('Subscription expired:', data);
    
  });
};

module.exports = { startScheduler };