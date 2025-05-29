const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'CANCELLED', 'EXPIRED'],
    default: 'ACTIVE'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
}, {
  timestamps: true
});

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ status: 1 });

subscriptionSchema.methods.isExpired = function() {
  return this.endDate < new Date();
};

subscriptionSchema.methods.isActive = function() {
  return this.status === 'ACTIVE' && !this.isExpired();
};

module.exports = mongoose.model('Subscription', subscriptionSchema);