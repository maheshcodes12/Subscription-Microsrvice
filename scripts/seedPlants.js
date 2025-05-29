require('dotenv').config();
const mongoose = require('mongoose');
const Plan = require('../models/Plan');

const samplePlans = [
  {
    name: 'Basic',
    price: 9.99,
    duration: 30,
    features: [
      'Up to 5 projects',
      'Basic support',
      '10GB storage',
      'Email notifications'
    ]
  },
  {
    name: 'Pro',
    price: 29.99,
    duration: 30,
    features: [
      'Unlimited projects',
      'Priority support',
      '100GB storage',
      'Advanced analytics',
      'Team collaboration',
      'API access'
    ]
  },
  {
    name: 'Enterprise',
    price: 99.99,
    duration: 30,
    features: [
      'Everything in Pro',
      'Dedicated support',
      '1TB storage',
      'Custom integrations',
      'Advanced security',
      'SLA guarantee',
      'White-label options'
    ]
  }
];

const seedPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing plans
    await Plan.deleteMany({});
    console.log('Cleared existing plans');

    // Insert sample plans
    const plans = await Plan.insertMany(samplePlans);
    console.log(`Created ${plans.length} plans:`);
    plans.forEach(plan => {
      console.log(`- ${plan.name}: $${plan.price}/month`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding plans:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedPlans();
}

module.exports = { seedPlans, samplePlans };