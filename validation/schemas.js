const Joi = require('joi');

const createSubscriptionSchema = Joi.object({
  userId: Joi.string().required().min(1).max(100),
  planId: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/),
  autoRenew: Joi.boolean().default(false),
});

const updateSubscriptionSchema = Joi.object({
  planId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  autoRenew: Joi.boolean(),
}).min(1);

const createPlanSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  price: Joi.number().required().min(0),
  duration: Joi.number().required().min(1),
  features: Joi.array().items(Joi.string().min(1).max(200)),
  isActive: Joi.boolean().default(true)
});

const updatePlanSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  price: Joi.number().min(0),
  duration: Joi.number().min(1),
  features: Joi.array().items(Joi.string().min(1).max(200)),
  isActive: Joi.boolean()
}).min(1);

// Register schema
const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.empty': 'Password is required'
    }),
  role: Joi.string()
    .valid('user', 'admin')
    .default('user')
    .messages({
      'any.only': 'Role must be either user or admin'
    })
});

// Login schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required'
    })
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: error.details[0].message
    });
  }
  next();
};

module.exports = {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  createPlanSchema,
  updatePlanSchema,
  registerSchema,
  loginSchema,
  validate
};